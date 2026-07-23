import {
  findCartVariants,
  findCheckoutSettings,
  findOrderWithPayment,
  findPrivateOrder,
  insertOrderWithLinesAndPayment,
  markBankTransferClaimed,
  rejectBankTransferClaim,
  storeTelegramMessageId,
} from '@store-kit/db/queries/shopping'
import { checkoutInputSchema } from '@store-kit/db/schemas/shopping'
import type { CheckoutInput } from '@store-kit/db/schemas/shopping'
import { Result } from 'better-result'
import { Value } from 'typebox/value'

import { createQPayInvoice } from '../adapters/qpay'
import {
  answerTelegramCallback,
  editTelegramMessage,
  sendBankClaimMessage,
} from '../adapters/telegram'
import { confirmOrderPayment } from '../payments/operations'

export type CheckoutError =
  | { _tag: 'CartEmpty'; message: string }
  | { _tag: 'CartChanged'; message: string }
  | { _tag: 'InvalidCheckoutDetails'; message: string; fields: { path: string; message: string }[] }
  | { _tag: 'DeliveryUnavailable'; message: string }
  | { _tag: 'PaymentSetupFailed'; message: string; canUseBankTransfer: boolean }

type CheckoutCreated = {
  orderId: string
  orderNumber: string
  statusToken: string
  nextAction:
    | { type: 'qpay'; qrText: string; qrImage: string; urls: { name: string; link: string }[] }
    | { type: 'bank_transfer'; bankName: string; accountName: string; accountNumber: string }
}

const tokenHash = async (token: string) => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

const normalizePhone = (phone: string) => phone.replace(/[^0-9]/g, '').replace(/^976/, '')

export const createCheckoutOrder = async (input: CheckoutInput) => {
  if (!Value.Check(checkoutInputSchema, input))
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'InvalidCheckoutDetails',
      message: 'Захиалгын мэдээллээ шалгана уу.',
      fields: [...Value.Errors(checkoutInputSchema, input)].map(issue => ({
        path: issue.instancePath,
        message: issue.message,
      })),
    })
  const variantIds = new Set(input.items.map(item => item.variantId))
  if (variantIds.size !== input.items.length)
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'CartChanged',
      message: 'Нэг барааны сонголтыг давхар оруулах боломжгүй.',
    })
  const phone = normalizePhone(input.customer.phone)
  if (!/^[6789]\d{7}$/.test(phone))
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'InvalidCheckoutDetails',
      message: 'Утасны дугаараа шалгана уу.',
      fields: [{ path: '/customer/phone', message: 'Монголын 8 оронтой дугаар оруулна уу.' }],
    })

  const [settings, variants] = await Promise.all([
    findCheckoutSettings(),
    findCartVariants(input.items),
  ])
  if (!settings)
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'DeliveryUnavailable',
      message: 'Хүргэлтийн тохиргоо олдсонгүй.',
    })
  const byId = new Map(variants.map(variant => [variant.variantId, variant]))
  const changed = input.items.some(item => {
    const variant = byId.get(item.variantId)
    return (
      !variant ||
      !variant.active ||
      variant.productStatus !== 'active' ||
      variant.stockQuantity < item.quantity
    )
  })
  if (changed)
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'CartChanged',
      message: 'Сагсны бараа эсвэл үлдэгдэл өөрчлөгдсөн байна.',
    })

  const orderId = crypto.randomUUID()
  const orderNumber = `PLG-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`
  const statusToken = `${crypto.randomUUID()}${crypto.randomUUID()}`
  const subtotalMnt = input.items.reduce(
    (sum, item) => sum + byId.get(item.variantId)!.unitPriceMnt * item.quantity,
    0,
  )
  const totalMnt = subtotalMnt + settings.deliveryFeeMnt
  const now = Date.now()
  const invoice =
    input.paymentMethod === 'qpay'
      ? await createQPayInvoice({
          orderNumber,
          amountMnt: totalMnt,
          description: `${orderNumber} захиалга`,
        })
      : null
  if (invoice?.status === 'error')
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'PaymentSetupFailed',
      message: invoice.error.message,
      canUseBankTransfer: true,
    })

  await insertOrderWithLinesAndPayment({
    order: {
      id: orderId,
      number: orderNumber,
      statusTokenHash: await tokenHash(statusToken),
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
        id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
      orderId,
      method: input.paymentMethod,
      status: 'pending',
      amountMnt: totalMnt,
      providerInvoiceId: invoice?.status === 'ok' ? invoice.value.invoiceId : null,
      createdAt: now,
      updatedAt: now,
    },
  })

  const nextAction =
    invoice?.status === 'ok'
      ? {
          type: 'qpay' as const,
          qrText: invoice.value.qrText,
          qrImage: invoice.value.qrImage,
          urls: invoice.value.urls,
        }
      : {
          type: 'bank_transfer' as const,
          bankName: settings.bankName,
          accountName: settings.bankAccountName,
          accountNumber: settings.bankAccountNumber,
        }
  return Result.ok<CheckoutCreated, CheckoutError>({
    orderId,
    orderNumber,
    statusToken,
    nextAction,
  })
}

export const getPrivateOrderStatus = async (orderId: string, statusToken: string) => {
  const order = await findPrivateOrder(orderId, await tokenHash(statusToken))
  if (!order)
    return Result.err({ _tag: 'InvalidStatusToken' as const, message: 'Захиалга олдсонгүй.' })
  return Result.ok(order)
}

export const handleBankTransferCallback = async (input: {
  action: 'confirm' | 'reject'
  orderId: string
  callbackQueryId: string
}) => {
  const order = await findOrderWithPayment(input.orderId)
  if (!order?.payment || order.payment.method !== 'bank_transfer') return false
  if (input.action === 'confirm') {
    await confirmOrderPayment(input.orderId, {
      paymentId: `telegram:${input.callbackQueryId}`,
      amountMnt: order.payment.amountMnt,
      method: 'bank_transfer',
    })
  } else {
    await rejectBankTransferClaim(input.orderId, Date.now())
  }
  const text =
    input.action === 'confirm'
      ? `✅ ${order.number} төлбөр батлагдлаа`
      : `❌ ${order.number} төлбөр татгалзлаа`
  await answerTelegramCallback(input.callbackQueryId, text)
  if (order.payment.telegramMessageId)
    await editTelegramMessage(order.payment.telegramMessageId, text)
  return true
}

export const claimBankTransfer = async (orderId: string, statusToken: string) => {
  const privateOrder = await getPrivateOrderStatus(orderId, statusToken)
  if (privateOrder.status === 'error') return privateOrder
  const order = privateOrder.value
  if (!order.payment || order.payment.method !== 'bank_transfer')
    return Result.err({
      _tag: 'BankTransferClaimNotAllowed' as const,
      message: 'Энэ төлбөрт мэдэгдэл өгөх боломжгүй.',
    })
  if (order.payment.status === 'claimed' || order.payment.status === 'paid')
    return Result.ok({ paymentStatus: order.payment.status })
  const claimed = await markBankTransferClaimed(orderId, Date.now())
  if (!claimed) return Result.ok({ paymentStatus: order.payment.status })
  const sent = await sendBankClaimMessage({
    orderId,
    orderNumber: order.number,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    amountMnt: order.totalMnt,
  })
  if (sent.status === 'ok') await storeTelegramMessageId(orderId, sent.value.messageId, Date.now())
  return sent.status === 'ok'
    ? Result.ok({ paymentStatus: 'claimed' as const })
    : Result.err(sent.error)
}
