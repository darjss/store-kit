import type {
  BankTransferClaim,
  BankTransferClaimError,
  PaymentConfirmation,
  PaymentConfirmationError,
  PaymentMethod,
  PaymentRefresh,
  PaymentRefreshError,
} from '@store-kit/contracts/payments'
import { query as dbQuery } from '@store-kit/db'
/* oxlint-disable eslint/no-underscore-dangle */
import { Result } from 'better-result'
import { match } from 'dismatch'
import { matchAsync } from 'dismatch/async'

import { verifyQPayCallback, verifyQPayPayment } from '../adapters/qpay'
import {
  answerTelegramCallback,
  editTelegramMessage,
  sendBankClaimMessage,
  sendPaidOrderMessage,
} from '../adapters/telegram'
import { orderOperations } from '../orders/operations'
import {
  bankTransferClaimNotAllowed,
  paymentInsufficientStock,
  paymentMismatch,
  paymentVerificationFailed,
  qpayInvoiceMissing,
  staffNotificationFailed,
} from './errors'

export const confirmOrderPayment = async (
  orderId: string,
  reference: { paymentId: string; amountMnt: number; method: PaymentMethod },
) => {
  const current = await dbQuery.orders.findWithPayment(orderId)
  if (
    !current?.payment ||
    current.payment.amountMnt !== reference.amountMnt ||
    current.payment.method !== reference.method
  )
    return Result.err<PaymentConfirmation, PaymentConfirmationError>(paymentMismatch())

  if (current.payment.status === 'paid') {
    const stockApplied = current.status !== 'new'
    return Result.ok<PaymentConfirmation, PaymentConfirmationError>({
      orderId,
      paymentStatus: 'paid',
      orderStatus: stockApplied ? 'confirmed' : 'new',
      stockApplied,
      needsStaffAction: !stockApplied,
      newlyPaid: false,
    })
  }

  const paidAt = Date.now()
  const result = await dbQuery.payments.confirmAndDecrementStock({
    orderId,
    providerPaymentId: reference.paymentId,
    amountMnt: reference.amountMnt,
    method: reference.method,
    paidAt,
  })

  return matchAsync(
    result,
    'status',
  )<Result<PaymentConfirmation, PaymentConfirmationError>>({
    'confirmed': () =>
      Result.ok<PaymentConfirmation, PaymentConfirmationError>({
        orderId,
        paymentStatus: 'paid',
        orderStatus: 'confirmed',
        stockApplied: true,
        needsStaffAction: false,
        newlyPaid: true,
      }),
    'already-paid': ({ stockApplied }) =>
      Result.ok<PaymentConfirmation, PaymentConfirmationError>({
        orderId,
        paymentStatus: 'paid',
        orderStatus: stockApplied ? 'confirmed' : 'new',
        stockApplied,
        needsStaffAction: !stockApplied,
        newlyPaid: false,
      }),
    'payment-mismatch': () =>
      Result.err<PaymentConfirmation, PaymentConfirmationError>(paymentMismatch()),
    'insufficient-stock': async ({ method }) => {
      if (method === 'bank_transfer')
        return Result.err<PaymentConfirmation, PaymentConfirmationError>(
          paymentInsufficientStock(
            current.lines.flatMap(line => (line.variantId ? [line.variantId] : [])),
          ),
        )

      const newlyPaid = await dbQuery.payments.markQPayPaidWithoutStock({
        orderId,
        providerPaymentId: reference.paymentId,
        amountMnt: reference.amountMnt,
        method,
        paidAt,
      })
      if (!newlyPaid) {
        const existing = await dbQuery.orders.findWithPayment(orderId)
        if (existing?.payment?.status !== 'paid')
          return Result.err<PaymentConfirmation, PaymentConfirmationError>(paymentMismatch())
      }
      return Result.ok<PaymentConfirmation, PaymentConfirmationError>({
        orderId,
        paymentStatus: 'paid',
        orderStatus: 'new',
        stockApplied: false,
        needsStaffAction: true,
        newlyPaid,
      })
    },
  })
}

export const refreshQPayPayment = async (orderId: string, statusToken: string) => {
  const order = await orderOperations.getPrivateStatus(orderId, statusToken)
  if (order.status === 'error') return Result.err<PaymentRefresh, PaymentRefreshError>(order.error)

  const invoiceId = order.value.payment?.providerInvoiceId
  if (!invoiceId) return Result.err<PaymentRefresh, PaymentRefreshError>(qpayInvoiceMissing())

  const verified = await verifyQPayPayment(invoiceId)
  if (verified.status === 'error')
    return Result.err<PaymentRefresh, PaymentRefreshError>(paymentVerificationFailed())
  if (!verified.value)
    return Result.ok<PaymentRefresh, PaymentRefreshError>({ paymentStatus: 'pending' })

  const confirmation = await confirmOrderPayment(orderId, { ...verified.value, method: 'qpay' })
  return confirmation.status === 'ok'
    ? Result.ok<PaymentRefresh, PaymentRefreshError>(confirmation.value)
    : Result.err<PaymentRefresh, PaymentRefreshError>(confirmation.error)
}

export const handleQPayCallback = async (paymentId: string) => {
  const verified = await verifyQPayCallback(paymentId)
  if (verified.status === 'error') return

  const localPayment = await dbQuery.payments.findByProviderInvoiceId(verified.value.invoiceId)
  if (!localPayment) return

  const confirmation = await confirmOrderPayment(localPayment.orderId, {
    paymentId: verified.value.paymentId,
    amountMnt: verified.value.amountMnt,
    method: 'qpay',
  })
  if (confirmation.status !== 'ok' || !confirmation.value.newlyPaid) return

  const label = confirmation.value.needsStaffAction
    ? `ЯАРАЛТАЙ: үлдэгдэл хүрэлцэхгүй · ${localPayment.orderId}`
    : localPayment.orderId
  await sendPaidOrderMessage(label, localPayment.amountMnt)
}

type BankTransferCallbackAction = { type: 'confirm' } | { type: 'reject' }

const bankTransferCallbackAction = (
  action: BankTransferCallbackAction['type'],
): BankTransferCallbackAction => (action === 'confirm' ? { type: 'confirm' } : { type: 'reject' })

export const handleBankTransferCallback = async (input: {
  action: BankTransferCallbackAction['type']
  orderId: string
  callbackQueryId: string
}) => {
  const order = await dbQuery.orders.findWithPayment(input.orderId)
  if (!order?.payment || order.payment.method !== 'bank_transfer') return false
  const payment = order.payment

  return matchAsync(bankTransferCallbackAction(input.action))({
    confirm: async () => {
      const confirmation = await confirmOrderPayment(input.orderId, {
        paymentId: `telegram:${input.callbackQueryId}`,
        amountMnt: payment.amountMnt,
        method: 'bank_transfer',
      })

      return confirmation.match({
        ok: async () => {
          const text = `✅ ${order.number} төлбөр батлагдлаа`
          await answerTelegramCallback(input.callbackQueryId, text)
          if (payment.telegramMessageId) await editTelegramMessage(payment.telegramMessageId, text)
          return true
        },
        err: async error => {
          const text = match(
            error,
            '_tag',
          )({
            InsufficientStock: () => `⚠️ ${order.number} үлдэгдэл хүрэлцэхгүй байна`,
            PaymentMismatch: () => `⚠️ ${order.number} төлбөрийг баталж чадсангүй`,
          })
          await answerTelegramCallback(input.callbackQueryId, text)
          return true
        },
      })
    },
    reject: async () => {
      await dbQuery.payments.rejectBankTransferClaim(input.orderId, Date.now())
      const text = `❌ ${order.number} төлбөр татгалзлаа`
      await answerTelegramCallback(input.callbackQueryId, text)
      if (payment.telegramMessageId) await editTelegramMessage(payment.telegramMessageId, text)
      return true
    },
  })
}

export const claimBankTransfer = async (orderId: string, statusToken: string) => {
  const privateOrder = await orderOperations.getPrivateStatus(orderId, statusToken)
  const claimableOrder = Result.andThen(privateOrder, order => {
    if (!order.payment || order.payment.method !== 'bank_transfer')
      return Result.err(bankTransferClaimNotAllowed(order.payment?.status ?? 'failed'))
    if (
      order.payment.status !== 'pending' &&
      order.payment.status !== 'claimed' &&
      order.payment.status !== 'paid'
    )
      return Result.err(bankTransferClaimNotAllowed(order.payment.status))
    return Result.ok({ ...order, payment: order.payment })
  })
  if (claimableOrder.status === 'error')
    return Result.err<BankTransferClaim, BankTransferClaimError>(claimableOrder.error)

  const order = claimableOrder.value
  if (order.payment.status === 'paid')
    return Result.ok<BankTransferClaim, BankTransferClaimError>({ paymentStatus: 'paid' })
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
  return Result.err<BankTransferClaim, BankTransferClaimError>(staffNotificationFailed())
}

export const paymentOperations = {
  confirmOrderPayment,
  refreshQPayPayment,
  handleQPayCallback,
  claimBankTransfer,
  handleBankTransferCallback,
}
