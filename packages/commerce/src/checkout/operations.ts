import type {
  BankTransferClaim,
  BankTransferClaimError,
  CartCorrection,
  CheckoutCreated,
  CheckoutError,
  PrivateOrderError,
} from '@store-kit/contracts'
import { checkoutInputSchema } from '@store-kit/contracts/checkout'
/* oxlint-disable eslint/no-underscore-dangle */
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
import { Result } from 'better-result'
import { Value } from 'typebox/value'

import { createQPayInvoice } from '../adapters/qpay'
import {
  answerTelegramCallback,
  editTelegramMessage,
  sendBankClaimMessage,
} from '../adapters/telegram'
import { confirmOrderPayment } from '../payments/operations'

const tokenHash = async (token: string) => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

const normalizePhone = (phone: string) => phone.replace(/[^0-9]/g, '').replace(/^976/, '')

const checkoutFieldMessage = (path: string) => {
  if (path.startsWith('/items')) return 'Сагсны бараагаа шалгана уу.'
  if (path === '/customer/name') return 'Нэрээ оруулна уу.'
  if (path === '/customer/phone') return 'Монголын 8 оронтой дугаар оруулна уу.'
  if (path === '/delivery/district') return 'Дүүргээ сонгоно уу.'
  if (path === '/delivery/khoroo') return 'Хороогоо оруулна уу.'
  if (path === '/delivery/address') return 'Дэлгэрэнгүй хаягаа оруулна уу.'
  if (path === '/paymentMethod') return 'Төлбөрийн аргаа сонгоно уу.'
  return 'Захиалгын мэдээлэл буруу байна.'
}

export const createCheckoutOrder = async (input: unknown) => {
  if (
    input !== null &&
    typeof input === 'object' &&
    'items' in input &&
    Array.isArray(input.items) &&
    input.items.length === 0
  )
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'CartEmpty',
      message: 'Таны сагс хоосон байна.',
    })
  if (!Value.Check(checkoutInputSchema, input))
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'InvalidCheckoutDetails',
      message: 'Захиалгын мэдээллээ шалгана уу.',
      fields: [...Value.Errors(checkoutInputSchema, input)].map(issue => ({
        path: issue.instancePath,
        message: checkoutFieldMessage(issue.instancePath),
      })),
    })
  const variantIds = new Set(input.items.map(item => item.variantId))
  if (variantIds.size !== input.items.length)
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'InvalidCheckoutDetails',
      message: 'Нэг барааны сонголтыг давхар оруулах боломжгүй.',
      fields: [{ path: '/items', message: 'Нэг сонголтыг нэг удаа оруулна уу.' }],
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
  const corrections = input.items.flatMap<CartCorrection>(item => {
    const variant = byId.get(item.variantId)
    if (!variant)
      return [
        {
          _tag: 'MissingVariant',
          variantId: item.variantId,
          message: 'Энэ сонголт олдсонгүй. Сагснаас хасна уу.',
        },
      ]
    if (!variant.active || variant.productStatus !== 'active')
      return [
        {
          _tag: 'InactiveVariant',
          variantId: item.variantId,
          message: 'Энэ сонголт одоогоор худалдаалагдахгүй байна.',
        },
      ]
    if (variant.stockQuantity < item.quantity)
      return [
        {
          _tag: 'InsufficientStock',
          variantId: item.variantId,
          availableQuantity: variant.stockQuantity,
          message: 'Хүссэн тоо хэмжээгээр үлдэгдэл хүрэлцэхгүй байна.',
        },
      ]
    return []
  })
  if (corrections.length > 0)
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'CartChanged',
      message: 'Сагсны бараа эсвэл үлдэгдэл өөрчлөгдсөн байна.',
      corrections,
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
    return Result.err<NonNullable<typeof order>, PrivateOrderError>({
      _tag: 'InvalidStatusToken',
      message: 'Захиалга олдсонгүй.',
    })
  return Result.ok<NonNullable<typeof order>, PrivateOrderError>(order)
}

export const handleBankTransferCallback = async (input: {
  action: 'confirm' | 'reject'
  orderId: string
  callbackQueryId: string
}) => {
  const order = await findOrderWithPayment(input.orderId)
  if (!order?.payment || order.payment.method !== 'bank_transfer') return false
  if (input.action === 'confirm') {
    const confirmation = await confirmOrderPayment(input.orderId, {
      paymentId: `telegram:${input.callbackQueryId}`,
      amountMnt: order.payment.amountMnt,
      method: 'bank_transfer',
    })
    if (confirmation.status === 'error') {
      const text =
        confirmation.error._tag === 'InsufficientStock'
          ? `⚠️ ${order.number} үлдэгдэл хүрэлцэхгүй байна`
          : `⚠️ ${order.number} төлбөрийг баталж чадсангүй`
      await answerTelegramCallback(input.callbackQueryId, text)
      return true
    }

    const text = `✅ ${order.number} төлбөр батлагдлаа`
    await answerTelegramCallback(input.callbackQueryId, text)
    if (order.payment.telegramMessageId)
      await editTelegramMessage(order.payment.telegramMessageId, text)
    return true
  }

  await rejectBankTransferClaim(input.orderId, Date.now())
  const text = `❌ ${order.number} төлбөр татгалзлаа`
  await answerTelegramCallback(input.callbackQueryId, text)
  if (order.payment.telegramMessageId)
    await editTelegramMessage(order.payment.telegramMessageId, text)
  return true
}

export const claimBankTransfer = async (orderId: string, statusToken: string) => {
  const privateOrder = await getPrivateOrderStatus(orderId, statusToken)
  if (privateOrder.status === 'error')
    return Result.err<BankTransferClaim, BankTransferClaimError>(privateOrder.error)
  const order = privateOrder.value
  if (!order.payment || order.payment.method !== 'bank_transfer')
    return Result.err<BankTransferClaim, BankTransferClaimError>({
      _tag: 'BankTransferClaimNotAllowed',
      message: 'Энэ төлбөрт мэдэгдэл өгөх боломжгүй.',
      paymentStatus: order.payment?.status ?? 'failed',
    })
  if (order.payment.status === 'paid')
    return Result.ok<BankTransferClaim, BankTransferClaimError>({ paymentStatus: 'paid' })
  if (order.payment.status !== 'pending' && order.payment.status !== 'claimed')
    return Result.err<BankTransferClaim, BankTransferClaimError>({
      _tag: 'BankTransferClaimNotAllowed',
      message: 'Энэ төлбөрт мэдэгдэл өгөх боломжгүй.',
      paymentStatus: order.payment.status,
    })
  if (order.payment.status === 'claimed' && order.payment.telegramMessageId)
    return Result.ok<BankTransferClaim, BankTransferClaimError>({ paymentStatus: 'claimed' })
  if (order.payment.status === 'pending') {
    const claimed = await markBankTransferClaimed(orderId, Date.now())
    if (!claimed)
      return Result.ok<BankTransferClaim, BankTransferClaimError>({
        paymentStatus: order.payment.status,
      })
  }
  const sent = await sendBankClaimMessage({
    orderId,
    orderNumber: order.number,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    amountMnt: order.totalMnt,
  })
  if (sent.status === 'ok') {
    await storeTelegramMessageId(orderId, sent.value.messageId, Date.now())
    return Result.ok<BankTransferClaim, BankTransferClaimError>({ paymentStatus: 'claimed' })
  }

  await rejectBankTransferClaim(orderId, Date.now())
  return Result.err<BankTransferClaim, BankTransferClaimError>({
    _tag: 'StaffNotificationFailed',
    message: 'Ажилтанд мэдэгдэл илгээж чадсангүй. Дахин оролдоно уу.',
    retryable: true,
  })
}
