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

type SelectedPaymentMethod = { type: 'qpay' } | { type: 'bank_transfer' }

const selectPaymentMethod = (method: PaymentMethod): SelectedPaymentMethod =>
  method === 'qpay' ? { type: 'qpay' } : { type: 'bank_transfer' }

const preparePayment = (
  method: PaymentMethod,
  input: { orderNumber: string; totalMnt: number },
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

export const createCheckoutOrder = async (input: unknown) => {
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
  const phone = normalizePhone(input.customer.phone)
  if (!/^[6789]\d{7}$/.test(phone))
    return Result.err<CheckoutCreated, CheckoutError>(
      invalidCheckoutDetails(
        [{ path: '/customer/phone', message: 'Монголын 8 оронтой дугаар оруулна уу.' }],
        'Утасны дугаараа шалгана уу.',
      ),
    )

  const [settings, variants] = await Promise.all([
    dbQuery.checkout.findSettings(),
    dbQuery.cart.findVariants(input.items),
  ])
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
    { orderNumber, totalMnt },
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
      customerName: input.customer.name.trim(),
      customerPhone: phone,
      district: input.delivery.district,
      khoroo: input.delivery.khoroo.trim(),
      address: input.delivery.address.trim(),
      deliveryNotes: input.delivery.notes?.trim() || null,
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
        unitPriceMnt: variant.unitPriceMnt,
        quantity: item.quantity,
        lineTotalMnt: variant.unitPriceMnt * item.quantity,
      }
    }),
    payment: {
      id: createPaymentId(),
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
