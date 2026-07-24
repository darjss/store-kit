import type {
  BankTransferClaim,
  BankTransferClaimError,
  PaymentConfirmation,
  PaymentConfirmationError,
  PaymentMethod,
} from '@store-kit/contracts/payments'
import { query as dbQuery } from '@store-kit/db'
/* oxlint-disable eslint/no-underscore-dangle */
import { Result } from 'better-result'

import {
  answerTelegramCallback,
  editTelegramMessage,
  sendBankClaimMessage,
} from '../adapters/telegram'
import { orderOperations } from '../orders/operations'

export const confirmOrderPayment = async (
  orderId: string,
  reference: { paymentId: string; amountMnt: number; method: PaymentMethod },
) => {
  const current = await dbQuery.orders.findWithPayment(orderId)
  if (!current?.payment || current.payment.amountMnt !== reference.amountMnt)
    return Result.err<PaymentConfirmation, PaymentConfirmationError>({
      _tag: 'PaymentMismatch',
      message: 'Төлбөрийн мэдээлэл таарахгүй байна.',
    })
  if (current.payment.method !== reference.method)
    return Result.err<PaymentConfirmation, PaymentConfirmationError>({
      _tag: 'PaymentMismatch',
      message: 'Төлбөрийн мэдээлэл таарахгүй байна.',
    })
  if (current.payment.status === 'paid')
    return Result.ok<PaymentConfirmation, PaymentConfirmationError>({
      orderId,
      paymentStatus: 'paid',
      orderStatus: current.status === 'confirmed' ? 'confirmed' : 'new',
      stockApplied: current.status !== 'new',
      needsStaffAction: current.status === 'new',
      newlyPaid: false,
    })

  const paidAt = Date.now()
  const result = await dbQuery.payments.confirmAndDecrementStock({
    orderId,
    providerPaymentId: reference.paymentId,
    amountMnt: reference.amountMnt,
    method: reference.method,
    paidAt,
  })
  if (result.status === 'confirmed')
    return Result.ok<PaymentConfirmation, PaymentConfirmationError>({
      orderId,
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      stockApplied: true,
      needsStaffAction: false,
      newlyPaid: true,
    })
  if (result.status === 'already-paid')
    return Result.ok<PaymentConfirmation, PaymentConfirmationError>({
      orderId,
      paymentStatus: 'paid',
      orderStatus: result.stockApplied ? 'confirmed' : 'new',
      stockApplied: result.stockApplied,
      needsStaffAction: !result.stockApplied,
      newlyPaid: false,
    })

  if (reference.method === 'qpay') {
    const newlyPaid = await dbQuery.payments.markQPayPaidWithoutStock({
      orderId,
      providerPaymentId: reference.paymentId,
      amountMnt: reference.amountMnt,
      method: reference.method,
      paidAt,
    })
    if (!newlyPaid) {
      const existing = await dbQuery.orders.findWithPayment(orderId)
      if (existing?.payment?.status !== 'paid')
        return Result.err<PaymentConfirmation, PaymentConfirmationError>({
          _tag: 'PaymentMismatch',
          message: 'Төлбөрийн мэдээлэл таарахгүй байна.',
        })
    }
    return Result.ok<PaymentConfirmation, PaymentConfirmationError>({
      orderId,
      paymentStatus: 'paid',
      orderStatus: 'new',
      stockApplied: false,
      needsStaffAction: true,
      newlyPaid,
    })
  }
  return Result.err<PaymentConfirmation, PaymentConfirmationError>({
    _tag: 'InsufficientStock',
    message: 'Үлдэгдэл хүрэлцэхгүй тул төлбөрийг баталсангүй.',
    variantIds: current.lines.flatMap(line => (line.variantId ? [line.variantId] : [])),
  })
}

export const findQPayOrder = (invoiceId: string) =>
  dbQuery.payments.findByProviderInvoiceId(invoiceId)

export const handleBankTransferCallback = async (input: {
  action: 'confirm' | 'reject'
  orderId: string
  callbackQueryId: string
}) => {
  const order = await dbQuery.orders.findWithPayment(input.orderId)
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

  await dbQuery.payments.rejectBankTransferClaim(input.orderId, Date.now())
  const text = `❌ ${order.number} төлбөр татгалзлаа`
  await answerTelegramCallback(input.callbackQueryId, text)
  if (order.payment.telegramMessageId)
    await editTelegramMessage(order.payment.telegramMessageId, text)
  return true
}

export const claimBankTransfer = async (orderId: string, statusToken: string) => {
  const privateOrder = await orderOperations.getPrivateStatus(orderId, statusToken)
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
    const claimed = await dbQuery.payments.markBankTransferClaimed(orderId, Date.now())
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
    await dbQuery.payments.storeTelegramMessageId(orderId, sent.value.messageId, Date.now())
    return Result.ok<BankTransferClaim, BankTransferClaimError>({ paymentStatus: 'claimed' })
  }

  await dbQuery.payments.rejectBankTransferClaim(orderId, Date.now())
  return Result.err<BankTransferClaim, BankTransferClaimError>({
    _tag: 'StaffNotificationFailed',
    message: 'Ажилтанд мэдэгдэл илгээж чадсангүй. Дахин оролдоно уу.',
    retryable: true,
  })
}

export const paymentOperations = {
  confirmOrderPayment,
  findQPayOrder,
  claimBankTransfer,
  handleBankTransferCallback,
}
