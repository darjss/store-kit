import {
  confirmPaymentAndDecrementStock,
  findOrderWithPayment,
  findPaymentByProviderInvoiceId,
  markQPayPaidWithoutStock,
} from '@store-kit/db/queries/shopping'
import { Result } from 'better-result'

export type PaymentConfirmation = {
  orderId: string
  paymentStatus: 'paid'
  orderStatus: 'confirmed' | 'new'
  stockApplied: boolean
  needsStaffAction: boolean
  newlyPaid: boolean
}
export type PaymentConfirmationError =
  | { _tag: 'PaymentMismatch'; message: string }
  | { _tag: 'InsufficientStock'; message: string; variantIds: string[] }

export const confirmOrderPayment = async (
  orderId: string,
  reference: { paymentId: string; amountMnt: number; method: 'qpay' | 'bank_transfer' },
) => {
  const current = await findOrderWithPayment(orderId)
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
  const result = await confirmPaymentAndDecrementStock({
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
    const newlyPaid = await markQPayPaidWithoutStock({
      orderId,
      providerPaymentId: reference.paymentId,
      amountMnt: reference.amountMnt,
      method: reference.method,
      paidAt,
    })
    if (!newlyPaid) {
      const existing = await findOrderWithPayment(orderId)
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

export const findQPayOrder = (invoiceId: string) => findPaymentByProviderInvoiceId(invoiceId)
