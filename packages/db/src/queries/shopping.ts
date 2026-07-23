import { env } from 'cloudflare:workers'
import { and, eq, inArray, sql } from 'drizzle-orm'

import { db } from '../client'
import { product, productImage, productVariant, productVariantImage } from '../schema/catalog'
import { order, orderLine, payment } from '../schema/shopping'
import type { CartLineInput, NewOrder, NewOrderLine, NewPayment } from '../schemas/shopping'

export type NewOrderAggregate = {
  order: NewOrder
  lines: NewOrderLine[]
  payment: NewPayment
}

export const findCartVariants = async (items: CartLineInput[]) => {
  if (items.length === 0) return []
  const variantIds = [...new Set(items.map(item => item.variantId))]

  return db
    .select({
      variantId: productVariant.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      productStatus: product.status,
      variantName: productVariant.name,
      sku: productVariant.sku,
      options: productVariant.options,
      unitPriceMnt: productVariant.priceMnt,
      stockQuantity: productVariant.stockQuantity,
      active: productVariant.active,
      imageR2Key: sql<string | null>`coalesce(
        (
          select ${productImage.r2Key} from ${productVariantImage}
          inner join ${productImage} on ${productImage.id} = ${productVariantImage.imageId}
          where ${productVariantImage.variantId} = ${productVariant.id}
          order by ${productImage.sortOrder}
          limit 1
        ),
        (
          select ${productImage.r2Key} from ${productImage}
          where ${productImage.productId} = ${product.id}
          order by ${productImage.sortOrder}
          limit 1
        )
      )`,
    })
    .from(productVariant)
    .innerJoin(product, eq(productVariant.productId, product.id))
    .where(inArray(productVariant.id, variantIds))
    .orderBy(productVariant.id)
}

export const findCheckoutSettings = () =>
  db.query.checkoutSettings.findFirst({ where: { id: 'default' } })

export const insertOrderWithLinesAndPayment = async (aggregate: NewOrderAggregate) => {
  await db.batch([
    db.insert(order).values(aggregate.order),
    ...aggregate.lines.map(line => db.insert(orderLine).values(line)),
    db.insert(payment).values(aggregate.payment),
  ])
}

export const findPrivateOrder = (id: string, statusTokenHash: string) =>
  db.query.order.findFirst({
    where: { id, statusTokenHash },
    with: { lines: true, payment: true },
  })

export const findOrderByNumber = (number: string) => db.query.order.findFirst({ where: { number } })

export const markBankTransferClaimed = async (orderId: string, claimedAt: number) => {
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

export const findPaymentByProviderInvoiceId = (providerInvoiceId: string) =>
  db.query.payment.findFirst({ where: { providerInvoiceId } })

export const findPaymentByOrderId = (orderId: string) =>
  db.query.payment.findFirst({ where: { orderId } })

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

export const confirmPaymentAndDecrementStock = async (
  input: ConfirmPaymentWrite,
): Promise<ConfirmPaymentWriteResult> => {
  const currentPayment = await findPaymentByOrderId(input.orderId)
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

  const paymentAfterBatch = await findPaymentByOrderId(input.orderId)
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
