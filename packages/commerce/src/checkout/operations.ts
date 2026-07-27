import type { CartCorrection, CartLineInput } from '@store-kit/contracts/cart'
import type {
  BankTransferPaymentInstructions,
  CheckoutCreated,
  CheckoutError,
  CheckoutInput,
  QPayPaymentInstructions,
} from '@store-kit/contracts/checkout'
import { database } from '@store-kit/db'
import { createId } from '@store-kit/db/ids'
import { Result } from 'better-result'

import { createQPayInvoice } from '#commerce/adapters/qpay'
import { inactiveVariant, insufficientStock, missingVariant } from '#commerce/errors/cart'
import {
  changedCart,
  deliveryUnavailable,
  emptyCheckoutCart,
  invalidCheckoutDetails,
  paymentSetupFailed,
} from '#commerce/errors/checkout'
import { hashStatusToken } from '#commerce/orders/status-token'

const qpaySetupLeaseMs = 60_000
const qpaySetupRetryDelayMs = 5_000

export const normalizeCheckoutInput = (input: CheckoutInput): CheckoutInput => {
  const notes = input.delivery.notes?.trim()
  return {
    idempotencyKey: input.idempotencyKey,
    customer: {
      name: input.customer.name.trim(),
      phone: input.customer.phone.trim(),
    },
    delivery: {
      district: input.delivery.district,
      khoroo: input.delivery.khoroo.trim(),
      address: input.delivery.address.trim(),
      ...(notes ? { notes } : {}),
    },
    paymentMethod: input.paymentMethod,
    items: input.items,
  }
}

type AuthoritativeVariant = Awaited<
  ReturnType<typeof database.query.checkout.prepare>
>['variants'][number]
type CheckoutRecord = NonNullable<Awaited<ReturnType<typeof database.query.checkout.findByKeyHash>>>

const validateAuthoritativeCartLine = (
  item: CartLineInput,
  variant: AuthoritativeVariant | undefined,
): CartCorrection[] => {
  if (!variant) return [missingVariant(item.variantId)]

  const corrections: CartCorrection[] = []
  if (!variant.active || variant.productStatus !== 'active') {
    corrections.push(inactiveVariant(item.variantId))
  }
  if (variant.stockQuantity < item.quantity) {
    corrections.push(insufficientStock(item.variantId, variant.stockQuantity))
  }
  return corrections
}

const checkoutIdentity = async (input: CheckoutInput) => {
  const { idempotencyKey: _idempotencyKey, ...request } = input
  const [checkoutKeyHash, checkoutRequestHash, statusToken] = await Promise.all([
    hashStatusToken(`checkout:${input.idempotencyKey}`),
    hashStatusToken(JSON.stringify(request)),
    hashStatusToken(`status:${input.idempotencyKey}`),
  ])
  return { checkoutKeyHash, checkoutRequestHash, statusToken }
}

const checkoutCreated = (
  record: CheckoutRecord,
  statusToken: string,
): Result<CheckoutCreated, CheckoutError> => {
  const nextAction = record.payment?.checkoutNextAction
  if (!nextAction) return Result.err(paymentSetupFailed('Төлбөрийн хүсэлт бэлтгэгдэж байна.'))

  return Result.ok({
    orderId: record.id,
    orderNumber: record.number,
    statusToken,
    nextAction,
  })
}

const setupQPay = async (record: CheckoutRecord, statusToken: string) => {
  const payment = record.payment
  const checkoutKeyHash = record.checkoutKeyHash
  if (!payment || payment.method !== 'qpay' || !checkoutKeyHash) {
    return Result.err<CheckoutCreated, CheckoutError>(
      paymentSetupFailed('Төлбөрийн хүсэлтийг бэлтгэж чадсангүй.'),
    )
  }
  if (payment.checkoutNextAction) return checkoutCreated(record, statusToken)

  const now = Date.now()
  const leaseId = crypto.randomUUID()
  const claimed = await database.query.checkout.claimQPaySetup(
    payment.id,
    leaseId,
    now,
    now + qpaySetupLeaseMs,
  )
  if (!claimed) {
    const replay = await database.query.checkout.findByKeyHash(checkoutKeyHash)
    return replay
      ? checkoutCreated(replay, statusToken)
      : Result.err<CheckoutCreated, CheckoutError>(
          paymentSetupFailed('Төлбөрийн хүсэлтийг бэлтгэж чадсангүй.'),
        )
  }

  const invoice = await createQPayInvoice({
    orderNumber: record.number,
    amountMnt: payment.amountMnt,
    description: `${record.number} захиалга`,
    paymentLookupId: payment.id,
  })

  return invoice.match<Promise<Result<CheckoutCreated, CheckoutError>>>({
    err: async error => {
      const failedAt = Date.now()
      await database.query.checkout.releaseQPaySetup(
        payment.id,
        leaseId,
        failedAt + qpaySetupRetryDelayMs,
        failedAt,
      )
      return Result.err<CheckoutCreated, CheckoutError>(paymentSetupFailed(error.message))
    },
    ok: async value => {
      const nextAction = {
        type: 'qpay',
        qrText: value.qrText,
        qrImage: value.qrImage,
        urls: value.urls,
      } satisfies QPayPaymentInstructions
      const completed = await database.query.checkout.completeQPaySetup(
        payment.id,
        leaseId,
        value.invoiceId,
        nextAction,
        Date.now(),
      )
      if (completed) {
        return Result.ok<CheckoutCreated, CheckoutError>({
          orderId: record.id,
          orderNumber: record.number,
          statusToken,
          nextAction,
        })
      }

      const replay = await database.query.checkout.findByKeyHash(checkoutKeyHash)
      return replay
        ? checkoutCreated(replay, statusToken)
        : Result.err<CheckoutCreated, CheckoutError>(
            paymentSetupFailed('Төлбөрийн хүсэлтийг бэлтгэж чадсангүй.'),
          )
    },
  })
}

const replayCheckout = async (
  record: CheckoutRecord,
  checkoutRequestHash: string,
  statusToken: string,
) => {
  if (record.checkoutRequestHash !== checkoutRequestHash) {
    return Result.err<CheckoutCreated, CheckoutError>(
      invalidCheckoutDetails([{ path: '/idempotencyKey', code: 'invalid' }]),
    )
  }
  if (record.payment?.checkoutNextAction) return checkoutCreated(record, statusToken)
  return setupQPay(record, statusToken)
}

export const createCheckoutOrder = async (checkoutInput: CheckoutInput) => {
  const input = normalizeCheckoutInput(checkoutInput)
  const identity = await checkoutIdentity(input)
  const existing = await database.query.checkout.findByKeyHash(identity.checkoutKeyHash)
  if (existing) {
    return replayCheckout(existing, identity.checkoutRequestHash, identity.statusToken)
  }

  if (input.items.length === 0)
    return Result.err<CheckoutCreated, CheckoutError>(emptyCheckoutCart())

  const variantIds = new Set(input.items.map(item => item.variantId))
  if (variantIds.size !== input.items.length)
    return Result.err<CheckoutCreated, CheckoutError>(
      invalidCheckoutDetails([{ path: '/items', code: 'duplicate' }]),
    )

  const { settings, variants } = await database.query.checkout.prepare(input.items)
  if (!settings) return Result.err<CheckoutCreated, CheckoutError>(deliveryUnavailable())

  const byId = new Map(variants.map(variant => [variant.variantId, variant]))
  const corrections = input.items.flatMap(item =>
    validateAuthoritativeCartLine(item, byId.get(item.variantId)),
  )
  if (corrections.length > 0)
    return Result.err<CheckoutCreated, CheckoutError>(changedCart(corrections))

  const orderId = createId('order')
  const paymentId = createId('payment')
  const orderNumber = `${settings.orderPrefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`
  const subtotalMnt = input.items.reduce(
    (sum, item) => sum + byId.get(item.variantId)!.unitPriceMnt * item.quantity,
    0,
  )
  const totalMnt = subtotalMnt + settings.deliveryFeeMnt
  const now = Date.now()
  const bankTransfer = {
    type: 'bank_transfer',
    bankName: settings.bankName,
    accountName: settings.bankAccountName,
    accountNumber: settings.bankAccountNumber,
  } satisfies BankTransferPaymentInstructions

  try {
    await database.query.checkout.insertOrder({
      order: {
        id: orderId,
        number: orderNumber,
        statusTokenHash: await hashStatusToken(identity.statusToken),
        checkoutKeyHash: identity.checkoutKeyHash,
        checkoutRequestHash: identity.checkoutRequestHash,
        status: 'new',
        customerName: input.customer.name,
        customerPhone: input.customer.phone,
        district: input.delivery.district,
        khoroo: input.delivery.khoroo,
        address: input.delivery.address,
        deliveryNotes: input.delivery.notes ?? null,
        subtotalMnt,
        deliveryFeeMnt: settings.deliveryFeeMnt,
        totalMnt,
        createdAt: now,
        updatedAt: now,
      },
      lines: input.items.map(item => {
        const variant = byId.get(item.variantId)!
        return {
          id: createId('orderLine'),
          orderId,
          productId: variant.productId,
          variantId: variant.variantId,
          productName: variant.productName,
          variantName: variant.variantName,
          sku: variant.sku,
          options: variant.options,
          imageR2Key: variant.imageR2Key,
          imageWidth: variant.imageWidth,
          imageHeight: variant.imageHeight,
          imageAlt: variant.imageAlt,
          unitPriceMnt: variant.unitPriceMnt,
          quantity: item.quantity,
          lineTotalMnt: variant.unitPriceMnt * item.quantity,
        }
      }),
      payment: {
        id: paymentId,
        orderId,
        method: input.paymentMethod,
        status: 'pending',
        amountMnt: totalMnt,
        checkoutNextAction: input.paymentMethod === 'bank_transfer' ? bankTransfer : null,
        createdAt: now,
        updatedAt: now,
      },
    })
  } catch (error) {
    const concurrent = await database.query.checkout.findByKeyHash(identity.checkoutKeyHash)
    if (!concurrent) throw error
    return replayCheckout(concurrent, identity.checkoutRequestHash, identity.statusToken)
  }

  const persisted = await database.query.checkout.findByKeyHash(identity.checkoutKeyHash)
  if (!persisted) throw new Error('Persisted checkout could not be replayed.')
  return replayCheckout(persisted, identity.checkoutRequestHash, identity.statusToken)
}

export const checkoutOperations = { createOrder: createCheckoutOrder }
