import type {
  BankTransferClaim,
  BankTransferClaimError,
  PaymentConfirmation,
  PaymentConfirmationError,
  PaymentMethod,
  PaymentRefresh,
  PaymentRefreshError,
  PaymentStatus,
} from '@store-kit/contracts/payments'
import { query as dbQuery } from '@store-kit/db'
/* oxlint-disable eslint/no-underscore-dangle */
import { Result } from 'better-result'
import { match } from 'dismatch'
import { matchAsync } from 'dismatch/async'

import { verifyQPayPayment } from '../adapters/qpay'
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
  reference: {
    paymentId: string
    amountMnt: number
    method: PaymentMethod
    telegramMessageId?: string
  },
) => {
  const paidAt = Date.now()
  const result = await dbQuery.payments.confirmAndDecrementStock({
    orderId,
    providerPaymentId: reference.paymentId,
    amountMnt: reference.amountMnt,
    method: reference.method,
    paidAt,
    telegramMessageId: reference.telegramMessageId,
  })

  return matchAsync(
    result,
    'status',
  )<Result<PaymentConfirmation, PaymentConfirmationError>>({
    'confirmed': ({ orderStatus }) =>
      Result.ok<PaymentConfirmation, PaymentConfirmationError>({
        orderId,
        paymentStatus: 'paid',
        orderStatus,
        stockApplied: true,
        needsStaffAction: false,
        newlyPaid: true,
      }),
    'already-paid': ({ stockApplied, orderStatus }) =>
      Result.ok<PaymentConfirmation, PaymentConfirmationError>({
        orderId,
        paymentStatus: 'paid',
        orderStatus,
        stockApplied,
        needsStaffAction: !stockApplied,
        newlyPaid: false,
      }),
    'payment-mismatch': () =>
      Result.err<PaymentConfirmation, PaymentConfirmationError>(paymentMismatch()),
    'insufficient-stock': ({ method, orderStatus, newlyPaid, variantIds }) => {
      if (method === 'bank_transfer')
        return Result.err<PaymentConfirmation, PaymentConfirmationError>(
          paymentInsufficientStock(variantIds),
        )

      return Result.ok<PaymentConfirmation, PaymentConfirmationError>({
        orderId,
        paymentStatus: 'paid',
        orderStatus,
        stockApplied: false,
        needsStaffAction: true,
        newlyPaid,
      })
    },
    'write-incomplete': () =>
      Result.err<PaymentConfirmation, PaymentConfirmationError>(paymentMismatch()),
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

export type WebhookOutcome = { status: 'acknowledged' } | { status: 'retryable-failure' }
const acknowledged = (): WebhookOutcome => ({ status: 'acknowledged' })
const retryableFailure = (): WebhookOutcome => ({ status: 'retryable-failure' })

export const handleQPayCallback = async (paymentLookupId: string): Promise<WebhookOutcome> => {
  const localPayment = await dbQuery.payments.findById(paymentLookupId)
  if (!localPayment || localPayment.method !== 'qpay' || localPayment.providerInvoiceId === null)
    return acknowledged()

  const verified = await verifyQPayPayment(localPayment.providerInvoiceId)
  if (verified.status === 'error') return retryableFailure()
  if (!verified.value) return retryableFailure()

  const confirmation = await confirmOrderPayment(localPayment.orderId, {
    paymentId: verified.value.paymentId,
    amountMnt: verified.value.amountMnt,
    method: 'qpay',
  })
  if (confirmation.status !== 'ok') return acknowledged()

  const persistedPayment = await dbQuery.payments.findById(paymentLookupId)
  if (persistedPayment?.telegramMessageId) return acknowledged()

  const label = confirmation.value.needsStaffAction
    ? `ЯАРАЛТАЙ: үлдэгдэл хүрэлцэхгүй · ${localPayment.orderId}`
    : localPayment.orderId
  const sent = await sendPaidOrderMessage(label, localPayment.amountMnt)
  if (sent.status === 'error') return retryableFailure()
  await dbQuery.payments.storeQPayTelegramMessageId(
    paymentLookupId,
    sent.value.messageId,
    Date.now(),
  )
  return acknowledged()
}

type BankTransferCallbackAction = { type: 'confirm' } | { type: 'reject' }

const bankTransferCallbackAction = (
  action: BankTransferCallbackAction['type'],
): BankTransferCallbackAction => (action === 'confirm' ? { type: 'confirm' } : { type: 'reject' })

const callbackStateText = (orderNumber: string, status: PaymentStatus) => {
  switch (status) {
    case 'pending':
      return `ℹ️ ${orderNumber} төлбөрийн мэдэгдэл хүлээгдэж байна`
    case 'claimed':
      return `ℹ️ ${orderNumber} төлбөр шалгагдаж байна`
    case 'confirming':
      return `ℹ️ ${orderNumber} төлбөр баталгаажиж байна`
    case 'paid':
      return `✅ ${orderNumber} төлбөр батлагдсан`
    case 'failed':
      return `⚠️ ${orderNumber} төлбөр амжилтгүй`
  }
}

const respondToTelegramCallback = async (
  input: { callbackQueryId: string; telegramMessageId: string },
  text: string,
  editableMessageId: string | null,
): Promise<WebhookOutcome> => {
  const answered = await answerTelegramCallback(input.callbackQueryId, text)
  if (answered.status === 'error' || !answered.value) return retryableFailure()
  if (editableMessageId !== input.telegramMessageId) return acknowledged()

  const edited = await editTelegramMessage(input.telegramMessageId, text)
  return edited.status === 'ok' && edited.value ? acknowledged() : retryableFailure()
}

export const handleBankTransferCallback = async (input: {
  action: BankTransferCallbackAction['type']
  orderId: string
  callbackQueryId: string
  telegramMessageId: string
}): Promise<WebhookOutcome> => {
  const order = await dbQuery.orders.findWithPayment(input.orderId)
  if (!order?.payment || order.payment.method !== 'bank_transfer') return acknowledged()
  const payment = order.payment

  return matchAsync(bankTransferCallbackAction(input.action))({
    confirm: async () => {
      const messageMatches =
        payment.status === 'claimed' && payment.telegramMessageId === input.telegramMessageId
      const confirmation = messageMatches
        ? await confirmOrderPayment(input.orderId, {
            paymentId: `telegram:${input.callbackQueryId}`,
            amountMnt: payment.amountMnt,
            method: 'bank_transfer',
            telegramMessageId: input.telegramMessageId,
          })
        : undefined
      const persisted = await dbQuery.orders.findWithPayment(input.orderId)
      if (!persisted?.payment) return acknowledged()
      const persistedPayment = persisted.payment
      const text =
        confirmation?.status === 'error'
          ? match(
              confirmation.error,
              '_tag',
            )({
              InsufficientStock: () => `⚠️ ${persisted.number} үлдэгдэл хүрэлцэхгүй байна`,
              PaymentMismatch: () => callbackStateText(persisted.number, persistedPayment.status),
            })
          : callbackStateText(persisted.number, persistedPayment.status)
      return respondToTelegramCallback(input, text, persistedPayment.telegramMessageId)
    },
    reject: async () => {
      const rejection = await dbQuery.payments.rejectBankTransferClaim(
        input.orderId,
        input.telegramMessageId,
        Date.now(),
      )
      if (!rejection.persisted) return acknowledged()
      const text = rejection.transitioned
        ? `❌ ${rejection.persisted.number} төлбөр татгалзлаа`
        : callbackStateText(rejection.persisted.number, rejection.persisted.paymentStatus)
      return respondToTelegramCallback(
        input,
        text,
        rejection.transitioned ? input.telegramMessageId : rejection.persisted.telegramMessageId,
      )
    },
  })
}

export const claimBankTransfer = async (orderId: string, statusToken: string) => {
  const privateOrder = await orderOperations.getPrivateStatus(orderId, statusToken)
  const claimableOrder = Result.andThen(privateOrder, order => {
    if (!order.payment || order.payment.method !== 'bank_transfer')
      return Result.err(bankTransferClaimNotAllowed(order.payment?.status ?? 'failed'))
    if (order.status !== 'new') return Result.err(bankTransferClaimNotAllowed(order.payment.status))
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
  if (order.payment.status === 'claimed')
    return Result.ok<BankTransferClaim, BankTransferClaimError>({ paymentStatus: 'claimed' })
  const claimed = await dbQuery.payments.markBankTransferClaimed(orderId, Date.now())
  if (!claimed) {
    const persisted = await dbQuery.payments.findByOrderId(orderId)
    if (
      persisted?.status === 'pending' ||
      persisted?.status === 'claimed' ||
      persisted?.status === 'paid'
    )
      return Result.ok<BankTransferClaim, BankTransferClaimError>({
        paymentStatus: persisted.status,
      })
    return Result.err<BankTransferClaim, BankTransferClaimError>(
      bankTransferClaimNotAllowed(persisted?.status ?? 'failed'),
    )
  }
  const sent = await sendBankClaimMessage({
    orderId,
    orderNumber: order.number,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    amountMnt: order.totalMnt,
  })
  if (sent.status === 'ok') {
    const stored = await dbQuery.payments.storeTelegramMessageId(
      orderId,
      sent.value.messageId,
      Date.now(),
    )
    if (stored)
      return Result.ok<BankTransferClaim, BankTransferClaimError>({ paymentStatus: 'claimed' })
  }

  await dbQuery.payments.releaseBankTransferClaim(orderId, Date.now())
  return Result.err<BankTransferClaim, BankTransferClaimError>(staffNotificationFailed())
}

export const paymentOperations = {
  confirmOrderPayment,
  refreshQPayPayment,
  handleQPayCallback,
  claimBankTransfer,
  handleBankTransferCallback,
}
