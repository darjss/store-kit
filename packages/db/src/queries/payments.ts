import type { OrderStatus } from '@store-kit/contracts/orders'
import type { PaymentStatus } from '@store-kit/contracts/payments'
import { and, eq, exists, gte, isNull, lt, notExists, or, sql } from 'drizzle-orm'

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
        exists(
          db
            .select({ value: sql`1` })
            .from(customerOrder)
            .where(and(eq(customerOrder.id, orderId), eq(customerOrder.status, 'new'))),
        ),
      ),
    )
    .returning()
  return updated
}

export const findById = (id: string): Promise<Payment | undefined> =>
  db.query.payment.findFirst({ where: { id } })

export const findByOrderId = (orderId: string): Promise<Payment | undefined> =>
  db.query.payment.findFirst({ where: { orderId } })

export const storeTelegramMessageId = async (
  orderId: string,
  messageId: string,
  updatedAt: number,
): Promise<Payment | undefined> => {
  const [stored] = await db
    .update(payment)
    .set({ telegramMessageId: messageId, updatedAt })
    .where(
      and(
        eq(payment.orderId, orderId),
        eq(payment.method, 'bank_transfer'),
        eq(payment.status, 'claimed'),
        isNull(payment.telegramMessageId),
      ),
    )
    .returning()
  return stored
}

export const storeQPayTelegramMessageId = async (
  paymentId: string,
  messageId: string,
  updatedAt: number,
): Promise<Payment | undefined> => {
  const [stored] = await db
    .update(payment)
    .set({ telegramMessageId: messageId, updatedAt })
    .where(
      and(
        eq(payment.id, paymentId),
        eq(payment.method, 'qpay'),
        eq(payment.status, 'paid'),
        isNull(payment.telegramMessageId),
      ),
    )
    .returning()
  return stored
}

export const releaseBankTransferClaim = (orderId: string, updatedAt: number): Promise<Payment[]> =>
  db
    .update(payment)
    .set({ status: 'pending', claimedAt: null, telegramMessageId: null, updatedAt })
    .where(
      and(
        eq(payment.orderId, orderId),
        eq(payment.method, 'bank_transfer'),
        eq(payment.status, 'claimed'),
        isNull(payment.telegramMessageId),
      ),
    )
    .returning()

export const rejectBankTransferClaim = async (
  orderId: string,
  telegramMessageId: string,
  updatedAt: number,
) => {
  const reject = db
    .update(payment)
    .set({ status: 'pending', claimedAt: null, telegramMessageId: null, updatedAt })
    .where(
      and(
        eq(payment.orderId, orderId),
        eq(payment.method, 'bank_transfer'),
        eq(payment.status, 'claimed'),
        eq(payment.telegramMessageId, telegramMessageId),
        exists(
          db
            .select({ value: sql`1` })
            .from(customerOrder)
            .where(and(eq(customerOrder.id, orderId), eq(customerOrder.status, 'new'))),
        ),
      ),
    )
    .returning({ id: payment.id })
  const inspectPersisted = db
    .select({
      number: customerOrder.number,
      orderStatus: sql<OrderStatus>`${customerOrder.status}`.as('order_status'),
      paymentStatus: sql<PaymentStatus>`${payment.status}`.as('payment_status'),
      telegramMessageId: sql<string | null>`${payment.telegramMessageId}`.as('telegram_message_id'),
    })
    .from(customerOrder)
    .innerJoin(payment, eq(payment.orderId, customerOrder.id))
    .where(eq(customerOrder.id, orderId))
    .limit(1)
  const [rejected, persisted] = await db.batch([reject, inspectPersisted])
  return { transitioned: rejected.length === 1, persisted: persisted[0] }
}

export type ConfirmPaymentWrite = {
  orderId: string
  providerPaymentId: string
  amountMnt: number
  method: 'qpay' | 'bank_transfer'
  paidAt: number
  telegramMessageId?: string
}

export type ConfirmPaymentWriteResult =
  | { status: 'confirmed'; orderStatus: OrderStatus }
  | { status: 'already-paid'; orderStatus: OrderStatus; stockApplied: boolean }
  | {
      status: 'insufficient-stock'
      method: 'qpay' | 'bank_transfer'
      paymentStatus: PaymentStatus
      orderStatus: OrderStatus
      newlyPaid: boolean
      variantIds: string[]
    }
  | { status: 'payment-mismatch' }
  | {
      status: 'write-incomplete'
      paymentStatus: PaymentStatus
      orderStatus: OrderStatus
    }

export const confirmAndDecrementStock = async (
  input: ConfirmPaymentWrite,
): Promise<ConfirmPaymentWriteResult> => {
  const inspectPayment = db
    .select({
      amountMnt: payment.amountMnt,
      method: payment.method,
      status: payment.status,
    })
    .from(payment)
    .where(eq(payment.orderId, input.orderId))
    .limit(1)
  const inspectOrder = db
    .select({ status: customerOrder.status })
    .from(customerOrder)
    .where(eq(customerOrder.id, input.orderId))
    .limit(1)
  const inspectLines = db
    .select({
      variantId: orderLine.variantId,
      quantity: orderLine.quantity,
      stockQuantity: productVariant.stockQuantity,
    })
    .from(orderLine)
    .leftJoin(productVariant, eq(productVariant.id, orderLine.variantId))
    .where(eq(orderLine.orderId, input.orderId))

  const eligiblePaymentState =
    input.method === 'qpay'
      ? eq(payment.status, 'pending')
      : and(
          eq(payment.status, 'claimed'),
          input.telegramMessageId ? eq(payment.telegramMessageId, input.telegramMessageId) : sql`0`,
        )
  const eligibleOrder = db
    .select({ value: sql`1` })
    .from(customerOrder)
    .where(and(eq(customerOrder.id, input.orderId), eq(customerOrder.status, 'new')))
  const orderedQuantity = sql<number>`(
    select coalesce(sum(${orderLine.quantity}), 0)
    from ${orderLine}
    where ${orderLine.orderId} = ${input.orderId}
      and ${orderLine.variantId} = ${productVariant.id}
  )`
  const unavailableStock = db
    .select({ value: sql`1` })
    .from(orderLine)
    .leftJoin(productVariant, eq(productVariant.id, orderLine.variantId))
    .where(
      and(
        eq(orderLine.orderId, input.orderId),
        or(isNull(productVariant.id), lt(productVariant.stockQuantity, orderedQuantity)),
      ),
    )
  const claim = db
    .update(payment)
    .set({ status: 'confirming', updatedAt: input.paidAt })
    .where(
      and(
        eq(payment.orderId, input.orderId),
        eq(payment.method, input.method),
        eq(payment.amountMnt, input.amountMnt),
        eligiblePaymentState,
        exists(eligibleOrder),
        exists(
          db
            .select({ value: sql`1` })
            .from(orderLine)
            .where(eq(orderLine.orderId, input.orderId)),
        ),
        notExists(unavailableStock),
      ),
    )
    .returning({ id: payment.id })

  const confirmingPayment = db
    .select({ value: sql`1` })
    .from(payment)
    .where(and(eq(payment.orderId, input.orderId), eq(payment.status, 'confirming')))
  const decrementStock = db
    .update(productVariant)
    .set({
      stockQuantity: sql`${productVariant.stockQuantity} - ${orderedQuantity}`,
      updatedAt: input.paidAt,
    })
    .where(
      and(
        exists(
          db
            .select({ value: sql`1` })
            .from(orderLine)
            .where(
              and(eq(orderLine.orderId, input.orderId), eq(orderLine.variantId, productVariant.id)),
            ),
        ),
        gte(productVariant.stockQuantity, orderedQuantity),
        exists(confirmingPayment),
      ),
    )
    .returning({ id: productVariant.id })

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

  const payQPayWithoutStock = db
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
        eq(payment.status, 'pending'),
        exists(eligibleOrder),
        exists(unavailableStock),
      ),
    )
    .returning({ id: payment.id })
  const inspectPersisted = db
    .select({
      orderStatus: sql<OrderStatus>`${customerOrder.status}`.as('order_status'),
      paymentStatus: sql<PaymentStatus>`${payment.status}`.as('payment_status'),
    })
    .from(customerOrder)
    .innerJoin(payment, eq(payment.orderId, customerOrder.id))
    .where(eq(customerOrder.id, input.orderId))
    .limit(1)

  const [
    paymentBeforeRows,
    orderBeforeRows,
    linesBefore,
    claimedPayments,
    decrementedVariants,
    finishedPayments,
    finishedOrders,
    qpayPaymentsWithoutStock,
    persistedRows,
  ] = await db.batch([
    inspectPayment,
    inspectOrder,
    inspectLines,
    claim,
    decrementStock,
    finishPayment,
    finishOrder,
    payQPayWithoutStock,
    inspectPersisted,
  ])

  const paymentBefore = paymentBeforeRows[0]
  const orderBefore = orderBeforeRows[0]
  const persisted = persistedRows[0]
  if (
    !paymentBefore ||
    !orderBefore ||
    !persisted ||
    paymentBefore.amountMnt !== input.amountMnt ||
    paymentBefore.method !== input.method
  )
    return { status: 'payment-mismatch' }

  if (paymentBefore.status === 'paid')
    return {
      status: 'already-paid',
      orderStatus: persisted.orderStatus,
      stockApplied: persisted.orderStatus !== 'new',
    }

  const expectedVariantIds = new Set(
    linesBefore.flatMap(line => (line.variantId ? [line.variantId] : [])),
  )
  const requestedByVariant = new Map<string, { quantity: number; stockQuantity: number }>()
  for (const line of linesBefore) {
    if (line.variantId === null || line.stockQuantity === null) continue
    const requested = requestedByVariant.get(line.variantId)
    requestedByVariant.set(line.variantId, {
      quantity: (requested?.quantity ?? 0) + line.quantity,
      stockQuantity: line.stockQuantity,
    })
  }
  const decrementedVariantIds = new Set(decrementedVariants.map(variant => variant.id))
  const everyStockWriteSucceeded =
    expectedVariantIds.size === decrementedVariantIds.size &&
    [...expectedVariantIds].every(variantId => decrementedVariantIds.has(variantId))

  if (claimedPayments.length > 0) {
    if (
      everyStockWriteSucceeded &&
      finishedPayments.length === 1 &&
      finishedOrders.length === 1 &&
      persisted.paymentStatus === 'paid' &&
      persisted.orderStatus === 'confirmed'
    )
      return { status: 'confirmed', orderStatus: persisted.orderStatus }

    return {
      status: 'write-incomplete',
      paymentStatus: persisted.paymentStatus,
      orderStatus: persisted.orderStatus,
    }
  }

  if (qpayPaymentsWithoutStock.length > 0)
    return {
      status: 'insufficient-stock',
      method: 'qpay',
      paymentStatus: persisted.paymentStatus,
      orderStatus: persisted.orderStatus,
      newlyPaid: true,
      variantIds: [...expectedVariantIds],
    }

  if (persisted.paymentStatus === 'paid')
    return {
      status: 'already-paid',
      orderStatus: persisted.orderStatus,
      stockApplied: persisted.orderStatus !== 'new',
    }

  const hasUnavailableStock =
    linesBefore.some(line => line.variantId === null || line.stockQuantity === null) ||
    [...requestedByVariant.values()].some(requested => requested.stockQuantity < requested.quantity)
  if (hasUnavailableStock)
    return {
      status: 'insufficient-stock',
      method: input.method,
      paymentStatus: persisted.paymentStatus,
      orderStatus: persisted.orderStatus,
      newlyPaid: false,
      variantIds: [...expectedVariantIds],
    }

  return { status: 'payment-mismatch' }
}

export const paymentQuery = {
  markBankTransferClaimed,
  findById,
  findByOrderId,
  storeTelegramMessageId,
  storeQPayTelegramMessageId,
  releaseBankTransferClaim,
  rejectBankTransferClaim,
  confirmAndDecrementStock,
}
