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
import { database } from '@store-kit/db'
import { Result } from 'better-result'
import { match } from 'dismatch'
import { matchAsync } from 'dismatch/async'

import { verifyQPayPayment } from '~/adapters/qpay'
import {
  answerTelegramCallback,
  editTelegramMessage,
  sendBankClaimMessage,
  sendPaidOrderMessage,
} from '~/adapters/telegram'
import {
  bankTransferClaimNotAllowed,
  paymentInsufficientStock,
  paymentMismatch,
  paymentVerificationFailed,
  qpayInvoiceMissing,
  staffNotificationFailed,
} from '~/errors'
import { orderOperations } from '~/orders/operations'

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
  const result = await database.query.payments.confirmAndDecrementStock({
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
  const invoice = (await orderOperations.getPrivateStatus(orderId, statusToken)).andThen(order =>
    order.payment?.providerInvoiceId
      ? Result.ok(order.payment.providerInvoiceId)
      : Result.err(qpayInvoiceMissing()),
  )

  return invoice.match<Promise<Result<PaymentRefresh, PaymentRefreshError>>>({
    err: async error => Result.err<PaymentRefresh, PaymentRefreshError>(error),
    ok: async invoiceId =>
      (await verifyQPayPayment(invoiceId))
        .mapError(() => paymentVerificationFailed())
        .match<Promise<Result<PaymentRefresh, PaymentRefreshError>>>({
          err: async error => Result.err<PaymentRefresh, PaymentRefreshError>(error),
          ok: async verifiedPayment =>
            verifiedPayment
              ? confirmOrderPayment(orderId, { ...verifiedPayment, method: 'qpay' })
              : Result.ok<PaymentRefresh, PaymentRefreshError>({ paymentStatus: 'pending' }),
        }),
  })
}

export type WebhookOutcome = { status: 'acknowledged' } | { status: 'retryable-failure' }
const acknowledged = (): WebhookOutcome => ({ status: 'acknowledged' })
const retryableFailure = (): WebhookOutcome => ({ status: 'retryable-failure' })

export const handleQPayCallback = async (paymentLookupId: string): Promise<WebhookOutcome> => {
  const localPayment = await database.query.payments.findById(paymentLookupId)
  if (!localPayment || localPayment.method !== 'qpay' || localPayment.providerInvoiceId === null)
    return acknowledged()

  return (await verifyQPayPayment(localPayment.providerInvoiceId)).match({
    err: async () => retryableFailure(),
    ok: async verifiedPayment => {
      if (!verifiedPayment) return retryableFailure()

      return (
        await confirmOrderPayment(localPayment.orderId, {
          paymentId: verifiedPayment.paymentId,
          amountMnt: verifiedPayment.amountMnt,
          method: 'qpay',
        })
      ).match({
        err: async () => acknowledged(),
        ok: async confirmation => {
          const persistedPayment = await database.query.payments.findById(paymentLookupId)
          if (persistedPayment?.telegramMessageId) return acknowledged()

          const label = confirmation.needsStaffAction
            ? `ЯАРАЛТАЙ: үлдэгдэл хүрэлцэхгүй · ${localPayment.orderId}`
            : localPayment.orderId
          return (await sendPaidOrderMessage(label, localPayment.amountMnt)).match({
            err: async () => retryableFailure(),
            ok: async sent => {
              await database.query.payments.storeQPayTelegramMessageId(
                paymentLookupId,
                sent.messageId,
                Date.now(),
              )
              return acknowledged()
            },
          })
        },
      })
    },
  })
}

type BankTransferCallbackAction = { type: 'confirm' } | { type: 'reject' }

const bankTransferCallbackAction = (
  action: BankTransferCallbackAction['type'],
): BankTransferCallbackAction => (action === 'confirm' ? { type: 'confirm' } : { type: 'reject' })

const paymentStates = {
  pending: { type: 'pending' },
  claimed: { type: 'claimed' },
  confirming: { type: 'confirming' },
  paid: { type: 'paid' },
  failed: { type: 'failed' },
} as const satisfies Record<PaymentStatus, { type: PaymentStatus }>

const callbackStateText = (orderNumber: string, status: PaymentStatus) =>
  match(paymentStates[status])({
    pending: () => `ℹ️ ${orderNumber} төлбөрийн мэдэгдэл хүлээгдэж байна`,
    claimed: () => `ℹ️ ${orderNumber} төлбөр шалгагдаж байна`,
    confirming: () => `ℹ️ ${orderNumber} төлбөр баталгаажиж байна`,
    paid: () => `✅ ${orderNumber} төлбөр батлагдсан`,
    failed: () => `⚠️ ${orderNumber} төлбөр амжилтгүй`,
  })

const respondToTelegramCallback = async (
  input: { callbackQueryId: string; telegramMessageId: string },
  text: string,
  editableMessageId: string | null,
): Promise<WebhookOutcome> => {
  return (await answerTelegramCallback(input.callbackQueryId, text)).match({
    err: async () => retryableFailure(),
    ok: async answered => {
      if (!answered) return retryableFailure()
      if (editableMessageId !== input.telegramMessageId) return acknowledged()

      return (await editTelegramMessage(input.telegramMessageId, text)).match({
        err: async () => retryableFailure(),
        ok: async edited => (edited ? acknowledged() : retryableFailure()),
      })
    },
  })
}

export const handleBankTransferCallback = async (input: {
  action: BankTransferCallbackAction['type']
  orderId: string
  callbackQueryId: string
  telegramMessageId: string
}): Promise<WebhookOutcome> => {
  const order = await database.query.orders.findWithPayment(input.orderId)
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
      const persisted = await database.query.orders.findWithPayment(input.orderId)
      if (!persisted?.payment) return acknowledged()
      const persistedPayment = persisted.payment
      const text = confirmation
        ? confirmation.match({
            err: error =>
              match(
                error,
                '_tag',
              )({
                InsufficientStock: () => `⚠️ ${persisted.number} үлдэгдэл хүрэлцэхгүй байна`,
                PaymentMismatch: () => callbackStateText(persisted.number, persistedPayment.status),
              }),
            ok: () => callbackStateText(persisted.number, persistedPayment.status),
          })
        : callbackStateText(persisted.number, persistedPayment.status)
      return respondToTelegramCallback(input, text, persistedPayment.telegramMessageId)
    },
    reject: async () => {
      const rejection = await database.query.payments.rejectBankTransferClaim(
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
  const claimableOrder = (await orderOperations.getPrivateStatus(orderId, statusToken)).andThen(
    order => {
      if (!order.payment || order.payment.method !== 'bank_transfer')
        return Result.err(bankTransferClaimNotAllowed(order.payment?.status ?? 'failed'))
      if (order.status !== 'new')
        return Result.err(bankTransferClaimNotAllowed(order.payment.status))
      return Result.ok({ ...order, payment: order.payment })
    },
  )

  return claimableOrder.match<Promise<Result<BankTransferClaim, BankTransferClaimError>>>({
    err: async error => Result.err<BankTransferClaim, BankTransferClaimError>(error),
    ok: order =>
      matchAsync(paymentStates[order.payment.status])<
        Result<BankTransferClaim, BankTransferClaimError>
      >({
        paid: () => Result.ok<BankTransferClaim, BankTransferClaimError>({ paymentStatus: 'paid' }),
        claimed: () =>
          Result.ok<BankTransferClaim, BankTransferClaimError>({ paymentStatus: 'claimed' }),
        confirming: () =>
          Result.err<BankTransferClaim, BankTransferClaimError>(
            bankTransferClaimNotAllowed('confirming'),
          ),
        failed: () =>
          Result.err<BankTransferClaim, BankTransferClaimError>(
            bankTransferClaimNotAllowed('failed'),
          ),
        pending: async () => {
          const claimed = await database.query.payments.markBankTransferClaimed(orderId, Date.now())
          if (!claimed) {
            const persisted = await database.query.payments.findByOrderId(orderId)
            if (!persisted)
              return Result.err<BankTransferClaim, BankTransferClaimError>(
                bankTransferClaimNotAllowed('failed'),
              )

            return match(paymentStates[persisted.status])<
              Result<BankTransferClaim, BankTransferClaimError>
            >({
              pending: () =>
                Result.ok<BankTransferClaim, BankTransferClaimError>({
                  paymentStatus: 'pending',
                }),
              claimed: () =>
                Result.ok<BankTransferClaim, BankTransferClaimError>({
                  paymentStatus: 'claimed',
                }),
              paid: () =>
                Result.ok<BankTransferClaim, BankTransferClaimError>({ paymentStatus: 'paid' }),
              confirming: () =>
                Result.err<BankTransferClaim, BankTransferClaimError>(
                  bankTransferClaimNotAllowed('confirming'),
                ),
              failed: () =>
                Result.err<BankTransferClaim, BankTransferClaimError>(
                  bankTransferClaimNotAllowed('failed'),
                ),
            })
          }

          const stored = await (
            await sendBankClaimMessage({
              orderId,
              orderNumber: order.number,
              customerName: order.customerName,
              customerPhone: order.customerPhone,
              amountMnt: order.totalMnt,
            })
          ).match({
            err: async () => undefined,
            ok: async sent =>
              database.query.payments.storeTelegramMessageId(orderId, sent.messageId, Date.now()),
          })
          if (stored)
            return Result.ok<BankTransferClaim, BankTransferClaimError>({
              paymentStatus: 'claimed',
            })

          await database.query.payments.releaseBankTransferClaim(orderId, Date.now())
          return Result.err<BankTransferClaim, BankTransferClaimError>(staffNotificationFailed())
        },
      }),
  })
}

export const paymentOperations = {
  confirmOrderPayment,
  refreshQPayPayment,
  handleQPayCallback,
  claimBankTransfer,
  handleBankTransferCallback,
}
