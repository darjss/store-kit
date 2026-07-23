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
/* oxlint-disable eslint/no-underscore-dangle */
import { Result } from 'better-result'
import { matchAsync } from 'dismatch/async'

import { createQPayInvoice } from '../adapters/qpay'
import {
  changedCart,
  deliveryUnavailable,
  emptyCheckoutCart,
  inactiveVariant,
  insufficientStock,
  invalidCheckoutDetails,
  missingVariant,
  paymentSetupFailed,
} from '../errors'
import { hashStatusToken } from '../orders/status-token'

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

type SelectedPaymentMethod = { type: 'qpay' } | { type: 'bank_transfer' }

const selectPaymentMethod = (method: PaymentMethod): SelectedPaymentMethod =>
  method === 'qpay' ? { type: 'qpay' } : { type: 'bank_transfer' }

const preparePayment = (
  method: PaymentMethod,
  input: { orderNumber: string; totalMnt: number; paymentId: string },
  bankTransfer: BankTransferPaymentInstructions,
) =>
  matchAsync(selectPaymentMethod(method))<
    Result<{ providerInvoiceId: string | null; nextAction: PaymentInstructions }, CheckoutError>
  >({
    qpay: async () =>
      (
        await createQPayInvoice({
          orderNumber: input.orderNumber,
          amountMnt: input.totalMnt,
          description: `${input.orderNumber} захиалга`,
          paymentLookupId: input.paymentId,
        })
      )
        .map(
          (
            invoice,
          ): {
            providerInvoiceId: string
            nextAction: QPayPaymentInstructions
          } => ({
            providerInvoiceId: invoice.invoiceId,
            nextAction: {
              type: 'qpay',
              qrText: invoice.qrText,
              qrImage: invoice.qrImage,
              urls: invoice.urls,
            },
          }),
        )
        .mapError(error => paymentSetupFailed(error.message)),
    bank_transfer: () =>
      Result.ok<{ providerInvoiceId: null; nextAction: PaymentInstructions }, CheckoutError>({
        providerInvoiceId: null,
        nextAction: bankTransfer,
      }),
  })

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
    if (!variant.active || variant.productStatus !== 'active')
      return [inactiveVariant(item.variantId)]
    if (variant.stockQuantity < item.quantity)
      return [insufficientStock(item.variantId, variant.stockQuantity)]
    return []
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
  if (payment.status === 'error') return Result.err<CheckoutCreated, CheckoutError>(payment.error)

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
      providerInvoiceId: payment.value.providerInvoiceId,
      createdAt: now,
      updatedAt: now,
    },
  })

  return Result.ok<CheckoutCreated, CheckoutError>({
    orderId,
    orderNumber,
    statusToken,
    nextAction: payment.value.nextAction,
  })
}

export const checkoutOperations = { createOrder: createCheckoutOrder }
