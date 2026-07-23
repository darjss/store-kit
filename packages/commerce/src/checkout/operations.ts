import type {
  BankTransferPaymentInstructions,
  CartCorrection,
  CheckoutCreated,
  CheckoutError,
  CheckoutInput,
  PaymentInstructions,
  PaymentMethod,
  QPayPaymentInstructions,
} from '@store-kit/contracts'
import { database } from '@store-kit/db'
import { createId } from '@store-kit/db/ids'
import { Result } from 'better-result'

import { createQPayInvoice } from '~/adapters/qpay'
import {
  changedCart,
  deliveryUnavailable,
  emptyCheckoutCart,
  inactiveVariant,
  insufficientStock,
  invalidCheckoutDetails,
  missingVariant,
  paymentSetupFailed,
} from '~/errors'
import { hashStatusToken } from '~/orders/status-token'

const normalizePhone = (phone: string) => phone.replace(/[^0-9]/g, '').replace(/^976/, '')

const normalizeCheckoutInput = (input: CheckoutInput) => ({
  ...input,
  customer: {
    name: input.customer.name.trim(),
    phone: normalizePhone(input.customer.phone),
  },
  delivery: {
    ...input.delivery,
    khoroo: input.delivery.khoroo.trim(),
    address: input.delivery.address.trim(),
    ...(input.delivery.notes?.trim()
      ? { notes: input.delivery.notes.trim() }
      : { notes: undefined }),
  },
})

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
  const input = normalizeCheckoutInput(rawInput)
  if (input.items.length === 0)
    return Result.err<CheckoutCreated, CheckoutError>(emptyCheckoutCart())

  const variantIds = new Set(input.items.map(item => item.variantId))
  if (variantIds.size !== input.items.length)
    return Result.err<CheckoutCreated, CheckoutError>(
      invalidCheckoutDetails([{ path: '/items', code: 'duplicate' }]),
    )
  if (!/^[6789]\d{7}$/.test(input.customer.phone))
    return Result.err<CheckoutCreated, CheckoutError>(
      invalidCheckoutDetails([{ path: '/customer/phone', code: 'invalid' }]),
    )

  const { settings, variants } = await database.query.checkout.prepare(input.items)
  if (!settings) return Result.err<CheckoutCreated, CheckoutError>(deliveryUnavailable())

  const byId = new Map(variants.map(variant => [variant.variantId, variant]))
  const corrections = input.items.flatMap<CartCorrection>(item => {
    const variant = byId.get(item.variantId)
    if (!variant) return [missingVariant(item.variantId)]

    const findings: CartCorrection[] = []
    if (!variant.active || variant.productStatus !== 'active')
      findings.push(inactiveVariant(item.variantId))
    if (variant.stockQuantity < item.quantity)
      findings.push(insufficientStock(item.variantId, variant.stockQuantity))
    return findings
  })
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
