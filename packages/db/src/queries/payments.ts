import { env } from 'cloudflare:workers'
import { and, eq } from 'drizzle-orm'

import { db } from '../client'
import { orderLine, payment } from '../schema/shopping'

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

  const claim = env.DB.prepare(
    `update payment set status = 'confirming', updated_at = ?
     where order_id = ? and status in ('pending', 'claimed')
       and not exists (
         select 1 from order_line
         left join product_variant on product_variant.id = order_line.variant_id
         where order_line.order_id = payment.order_id
           and (product_variant.id is null or product_variant.stock_quantity < order_line.quantity)
       )`,
  ).bind(input.paidAt, input.orderId)

  const decrements = lines.map(line =>
    env.DB.prepare(
      `update product_variant set stock_quantity = stock_quantity - ?, updated_at = ?
       where id = ? and stock_quantity >= ?
         and exists (select 1 from payment where order_id = ? and status = 'confirming')`,
    ).bind(line.quantity, input.paidAt, line.variantId, line.quantity, input.orderId),
  )

  const finishPayment = env.DB.prepare(
    `update payment set status = 'paid', provider_payment_id = ?, paid_at = ?, updated_at = ?
     where order_id = ? and status = 'confirming'`,
  ).bind(input.providerPaymentId, input.paidAt, input.paidAt, input.orderId)
  const finishOrder = env.DB.prepare(
    `update customer_order set status = 'confirmed', updated_at = ?
     where id = ? and status = 'new'
       and exists (select 1 from payment where order_id = ? and status = 'paid' and provider_payment_id = ?)`,
  ).bind(input.paidAt, input.orderId, input.orderId, input.providerPaymentId)

  const [claimResult] = await env.DB.batch([claim, ...decrements, finishPayment, finishOrder])
  if ((claimResult.meta.changes ?? 0) > 0) return { status: 'confirmed' }

  const paymentAfterBatch = await findByOrderId(input.orderId)
  if (paymentAfterBatch?.status === 'paid') {
    const currentOrder = await db.query.order.findFirst({ where: { id: input.orderId } })
    return { status: 'already-paid', stockApplied: currentOrder?.status === 'confirmed' }
  }
  if (paymentAfterBatch) return { status: 'insufficient-stock', method: paymentAfterBatch.method }
  return { status: 'payment-mismatch' }
}

export const markQPayPaidWithoutStock = async (input: ConfirmPaymentWrite) => {
  const results = await env.DB.batch([
    env.DB.prepare(
      `update payment set status = 'paid', provider_payment_id = ?, paid_at = ?, updated_at = ?
         where order_id = ? and method = 'qpay' and amount_mnt = ? and status in ('pending', 'claimed')`,
    ).bind(input.providerPaymentId, input.paidAt, input.paidAt, input.orderId, input.amountMnt),
  ])
  return (results[0].meta.changes ?? 0) > 0
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
