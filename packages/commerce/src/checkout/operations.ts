import type { CartCorrection, CartLineInput } from '@store-kit/contracts/cart'
import type {
  BankTransferPaymentInstructions,
  CheckoutCreated,
  CheckoutError,
  CheckoutInput,
  PaymentInstructions,
  QPayPaymentInstructions,
} from '@store-kit/contracts/checkout'
import { checkoutInputSchema } from '@store-kit/contracts/checkout'
import type { ValidationIssue } from '@store-kit/contracts/common'
import type { PaymentMethod } from '@store-kit/contracts/payments'
import { database } from '@store-kit/db'
import { createId } from '@store-kit/db/ids'
import { Result } from 'better-result'
import { Value } from 'typebox/value'

import { createQPayInvoice } from '~/adapters/qpay'
import { inactiveVariant, insufficientStock, missingVariant } from '~/errors/cart'
import {
  changedCart,
  deliveryUnavailable,
  emptyCheckoutCart,
  invalidCheckoutDetails,
  paymentSetupFailed,
} from '~/errors/checkout'
import { hashStatusToken } from '~/orders/status-token'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const trimString = (value: unknown) => (typeof value === 'string' ? value.trim() : value)
const normalizePhone = (value: unknown) =>
  typeof value === 'string' ? value.replace(/[^0-9]/g, '').replace(/^976/, '') : value

export const normalizeCheckoutInput = (input: unknown): unknown => {
  if (!isRecord(input)) return input

  const customer = isRecord(input.customer)
    ? {
        ...input.customer,
        name: trimString(input.customer.name),
        phone: normalizePhone(input.customer.phone),
      }
    : input.customer
  const delivery = isRecord(input.delivery)
    ? {
        ...input.delivery,
        khoroo: trimString(input.delivery.khoroo),
        address: trimString(input.delivery.address),
        notes: trimString(input.delivery.notes),
      }
    : input.delivery

  if (isRecord(delivery) && (delivery.notes === '' || delivery.notes === undefined)) {
    delete delivery.notes
  }

  return { ...input, customer, delivery }
}

const checkoutValidationIssues = (input: unknown): ValidationIssue[] => {
  const paths = new Set<string>()

  return [...Value.Errors(checkoutInputSchema, input)].flatMap(error => {
    const path = error.instancePath || '/'
    if (paths.has(path)) return []
    paths.add(path)
    return [{ path, code: 'invalid' as const }]
  })
}

type AuthoritativeVariant = Awaited<
  ReturnType<typeof database.query.checkout.prepare>
>['variants'][number]

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

type PreparedPayment = {
  providerInvoiceId: string | null
  nextAction: PaymentInstructions
}

const preparePayment = async (
  method: PaymentMethod,
  input: { orderNumber: string; totalMnt: number; paymentId: string },
  bankTransfer: BankTransferPaymentInstructions,
) => {
  if (method === 'bank_transfer') {
    const prepared = { providerInvoiceId: null, nextAction: bankTransfer } satisfies PreparedPayment
    return Result.ok<PreparedPayment, CheckoutError>(prepared)
  }

  return (
    await createQPayInvoice({
      orderNumber: input.orderNumber,
      amountMnt: input.totalMnt,
      description: `${input.orderNumber} захиалга`,
      paymentLookupId: input.paymentId,
    })
  )
    .map<PreparedPayment>(invoice => {
      const nextAction = {
        type: 'qpay',
        qrText: invoice.qrText,
        qrImage: invoice.qrImage,
        urls: invoice.urls,
      } satisfies QPayPaymentInstructions
      return { providerInvoiceId: invoice.invoiceId, nextAction } satisfies PreparedPayment
    })
    .mapError<CheckoutError>(error => paymentSetupFailed(error.message))
}

export const createCheckoutOrder = async (rawInput: CheckoutInput) => {
  const normalizedInput = normalizeCheckoutInput(rawInput)
  const validationIssues = checkoutValidationIssues(normalizedInput)
  if (
    isRecord(normalizedInput) &&
    Array.isArray(normalizedInput.items) &&
    normalizedInput.items.length === 0
  )
    return Result.err<CheckoutCreated, CheckoutError>(emptyCheckoutCart())
  if (validationIssues.length > 0) {
    return Result.err<CheckoutCreated, CheckoutError>(invalidCheckoutDetails(validationIssues))
  }
  const input = normalizedInput as CheckoutInput

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
  const orderNumber = `PLG-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`
  const statusToken = `${crypto.randomUUID()}${crypto.randomUUID()}`
  const subtotalMnt = input.items.reduce(
    (sum, item) => sum + byId.get(item.variantId)!.unitPriceMnt * item.quantity,
    0,
  )
  const totalMnt = subtotalMnt + settings.deliveryFeeMnt
  const now = Date.now()
  const payment = await preparePayment(
    input.paymentMethod,
    { orderNumber, totalMnt, paymentId },
    {
      type: 'bank_transfer',
      bankName: settings.bankName,
      accountName: settings.bankAccountName,
      accountNumber: settings.bankAccountNumber,
    },
  )

  return payment.match<Promise<Result<CheckoutCreated, CheckoutError>>>({
    err: async error => Result.err<CheckoutCreated, CheckoutError>(error),
    ok: async prepared => {
      await database.query.checkout.insertOrder({
        order: {
          id: orderId,
          number: orderNumber,
          statusTokenHash: await hashStatusToken(statusToken),
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
          providerInvoiceId: prepared.providerInvoiceId,
          createdAt: now,
          updatedAt: now,
        },
      })

      return Result.ok<CheckoutCreated, CheckoutError>({
        orderId,
        orderNumber,
        statusToken,
        nextAction: prepared.nextAction,
      })
    },
  })
}

export const checkoutOperations = { createOrder: createCheckoutOrder }
