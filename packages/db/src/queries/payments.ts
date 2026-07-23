import { and, eq, exists, gte, inArray, isNull, lt, notExists, or, sql } from 'drizzle-orm'

import { db } from '../client'
import { productVariant } from '../schema/catalog'
import { order as customerOrder, orderLine, payment } from '../schema/shopping'

type Payment = typeof payment.$inferSelect

export const markBankTransferClaimed = async (
  orderId: string,
  claimedAt: number,
): Promise<Payment | undefined> => {
  const [updated] = await db
    .update(payment)
    .set({ status: 'claimed', claimedAt, updatedAt: claimedAt })
    .where(
      and(
        eq(payment.orderId, orderId),
        eq(payment.method, 'bank_transfer'),
        eq(payment.status, 'pending'),
      ),
    )
    .returning()
  return updated
}

export const findByProviderInvoiceId = (providerInvoiceId: string): Promise<Payment | undefined> =>
  db.query.payment.findFirst({ where: { providerInvoiceId } })

export const findByOrderId = (orderId: string): Promise<Payment | undefined> =>
  db.query.payment.findFirst({ where: { orderId } })

export const storeTelegramMessageId = (orderId: string, messageId: string, updatedAt: number) =>
  db
    .update(payment)
    .set({ telegramMessageId: messageId, updatedAt })
    .where(and(eq(payment.orderId, orderId), eq(payment.status, 'claimed')))

export const rejectBankTransferClaim = (orderId: string, updatedAt: number): Promise<Payment[]> =>
  db
    .update(payment)
    .set({ status: 'pending', claimedAt: null, telegramMessageId: null, updatedAt })
    .where(
      and(
        eq(payment.orderId, orderId),
        eq(payment.method, 'bank_transfer'),
        eq(payment.status, 'claimed'),
      ),
    )
    .returning()

export type ConfirmPaymentWrite = {
  orderId: string
  providerPaymentId: string
  amountMnt: number
  method: 'qpay' | 'bank_transfer'
  paidAt: number
}

export type ConfirmPaymentWriteResult =
  | { status: 'confirmed' }
  | { status: 'already-paid'; stockApplied: boolean }
  | { status: 'insufficient-stock'; method: 'qpay' | 'bank_transfer' }
  | { status: 'payment-mismatch' }

export const confirmAndDecrementStock = async (
  input: ConfirmPaymentWrite,
): Promise<ConfirmPaymentWriteResult> => {
  const currentPayment = await findByOrderId(input.orderId)
  if (
    !currentPayment ||
    currentPayment.amountMnt !== input.amountMnt ||
    currentPayment.method !== input.method
  ) {
    return { status: 'payment-mismatch' }
  }
  if (currentPayment.status === 'paid') {
    const currentOrder = await db.query.order.findFirst({ where: { id: input.orderId } })
    return { status: 'already-paid', stockApplied: currentOrder?.status === 'confirmed' }
  }

  const lines = await db
    .select({ variantId: orderLine.variantId, quantity: orderLine.quantity })
    .from(orderLine)
    .where(eq(orderLine.orderId, input.orderId))

  const claim = db
    .update(payment)
    .set({ status: 'confirming', updatedAt: input.paidAt })
    .where(
      and(
        eq(payment.orderId, input.orderId),
        inArray(payment.status, ['pending', 'claimed']),
        notExists(
          db
            .select({ value: sql`1` })
            .from(orderLine)
            .leftJoin(productVariant, eq(productVariant.id, orderLine.variantId))
            .where(
              and(
                eq(orderLine.orderId, payment.orderId),
                or(isNull(productVariant.id), lt(productVariant.stockQuantity, orderLine.quantity)),
              ),
            ),
        ),
      ),
    )
    .returning({ id: payment.id })

  const paymentIsConfirming = db
    .select({ value: sql`1` })
    .from(payment)
    .where(and(eq(payment.orderId, input.orderId), eq(payment.status, 'confirming')))
  const decrementableLines = lines.flatMap(line =>
    line.variantId ? [{ ...line, variantId: line.variantId }] : [],
  )
  const decrements = decrementableLines.map(line =>
    db
      .update(productVariant)
      .set({
        stockQuantity: sql`${productVariant.stockQuantity} - ${line.quantity}`,
        updatedAt: input.paidAt,
      })
      .where(
        and(
          eq(productVariant.id, line.variantId),
          gte(productVariant.stockQuantity, line.quantity),
          exists(paymentIsConfirming),
        ),
      )
      .returning({ id: productVariant.id }),
  )

  const finishPayment = db
    .update(payment)
    .set({
      status: 'paid',
      providerPaymentId: input.providerPaymentId,
      paidAt: input.paidAt,
      updatedAt: input.paidAt,
    })
    .where(and(eq(payment.orderId, input.orderId), eq(payment.status, 'confirming')))
    .returning({ id: payment.id })
  const finishOrder = db
    .update(customerOrder)
    .set({ status: 'confirmed', updatedAt: input.paidAt })
    .where(
      and(
        eq(customerOrder.id, input.orderId),
        eq(customerOrder.status, 'new'),
        exists(
          db
            .select({ value: sql`1` })
            .from(payment)
            .where(
              and(
                eq(payment.orderId, input.orderId),
                eq(payment.status, 'paid'),
                eq(payment.providerPaymentId, input.providerPaymentId),
              ),
            ),
        ),
      ),
    )
    .returning({ id: customerOrder.id })

  const [claimedPayments] = await db.batch([claim, ...decrements, finishPayment, finishOrder])
  if (claimedPayments.length > 0) return { status: 'confirmed' }

  const paymentAfterBatch = await findByOrderId(input.orderId)
  if (paymentAfterBatch?.status === 'paid') {
    const currentOrder = await db.query.order.findFirst({ where: { id: input.orderId } })
    return { status: 'already-paid', stockApplied: currentOrder?.status === 'confirmed' }
  }
  if (paymentAfterBatch) return { status: 'insufficient-stock', method: paymentAfterBatch.method }
  return { status: 'payment-mismatch' }
}

export const markQPayPaidWithoutStock = async (input: ConfirmPaymentWrite) => {
  const [updatedPayments] = await db.batch([
    db
      .update(payment)
      .set({
        status: 'paid',
        providerPaymentId: input.providerPaymentId,
        paidAt: input.paidAt,
        updatedAt: input.paidAt,
      })
      .where(
        and(
          eq(payment.orderId, input.orderId),
          eq(payment.method, 'qpay'),
          eq(payment.amountMnt, input.amountMnt),
          inArray(payment.status, ['pending', 'claimed']),
        ),
      )
      .returning({ id: payment.id }),
  ])
  return updatedPayments.length > 0
}

export const paymentQuery = {
  markBankTransferClaimed,
  findByProviderInvoiceId,
  findByOrderId,
  storeTelegramMessageId,
  rejectBankTransferClaim,
  confirmAndDecrementStock,
  markQPayPaidWithoutStock,
}
