import type {
  BankTransferPaymentInstructions,
  CartCorrection,
  CheckoutCreated,
  CheckoutError,
  PaymentInstructions,
  PaymentMethod,
  QPayPaymentInstructions,
} from '@store-kit/contracts'
import { checkoutInputSchema } from '@store-kit/contracts/checkout'
import { query as dbQuery } from '@store-kit/db'
import { createOrderId, createOrderLineId, createPaymentId } from '@store-kit/db/ids'
/* oxlint-disable eslint/no-underscore-dangle */
import { Result } from 'better-result'
import { matchAsync } from 'dismatch/async'
import { Value } from 'typebox/value'

import { createQPayInvoice } from '../adapters/qpay'
import { inactiveVariant, insufficientStock, missingVariant } from '../cart/errors'
import { hashStatusToken } from '../orders/status-token'
import {
  changedCart,
  checkoutFieldMessage,
  deliveryUnavailable,
  emptyCheckoutCart,
  invalidCheckoutDetails,
  paymentSetupFailed,
} from './errors'

const normalizePhone = (phone: string) => phone.replace(/[^0-9]/g, '').replace(/^976/, '')
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const trimString = (value: unknown) => (typeof value === 'string' ? value.trim() : value)
const trimOptionalString = (value: unknown) => {
  const trimmed = trimString(value)
  return trimmed === '' ? undefined : trimmed
}

const normalizeCheckoutInput = (input: unknown): unknown => {
  if (!isRecord(input)) return input

  const customer = isRecord(input.customer)
    ? {
        ...input.customer,
        name: trimString(input.customer.name),
        phone:
          typeof input.customer.phone === 'string'
            ? normalizePhone(input.customer.phone)
            : input.customer.phone,
      }
    : input.customer
  const delivery = isRecord(input.delivery)
    ? {
        ...input.delivery,
        khoroo: trimString(input.delivery.khoroo),
        address: trimString(input.delivery.address),
        notes: trimOptionalString(input.delivery.notes),
      }
    : input.delivery

  return { ...input, customer, delivery }
}

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

export const createCheckoutOrder = async (rawInput: unknown) => {
  const input = normalizeCheckoutInput(rawInput)
  if (
    input !== null &&
    typeof input === 'object' &&
    'items' in input &&
    Array.isArray(input.items) &&
    input.items.length === 0
  )
    return Result.err<CheckoutCreated, CheckoutError>(emptyCheckoutCart())
  if (!Value.Check(checkoutInputSchema, input))
    return Result.err<CheckoutCreated, CheckoutError>(
      invalidCheckoutDetails(
        [...Value.Errors(checkoutInputSchema, input)].map(issue => ({
          path: issue.instancePath,
          message: checkoutFieldMessage(issue.instancePath),
        })),
      ),
    )
  const variantIds = new Set(input.items.map(item => item.variantId))
  if (variantIds.size !== input.items.length)
    return Result.err<CheckoutCreated, CheckoutError>(
      invalidCheckoutDetails(
        [{ path: '/items', message: 'Нэг сонголтыг нэг удаа оруулна уу.' }],
        'Нэг барааны сонголтыг давхар оруулах боломжгүй.',
      ),
    )
  if (!/^[6789]\d{7}$/.test(input.customer.phone))
    return Result.err<CheckoutCreated, CheckoutError>(
      invalidCheckoutDetails(
        [{ path: '/customer/phone', message: 'Монголын 8 оронтой дугаар оруулна уу.' }],
        'Утасны дугаараа шалгана уу.',
      ),
    )

  const { settings, variants } = await dbQuery.checkout.prepare(input.items)
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

  const orderId = createOrderId()
  const paymentId = createPaymentId()
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

  await dbQuery.checkout.insertOrder({
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
        id: createOrderLineId(),
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
