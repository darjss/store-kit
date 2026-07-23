import { eq, inArray } from 'drizzle-orm'
import { expect, test } from 'vite-plus/test'

import { db } from '../client'
import {
  createOrderId,
  createOrderLineId,
  createPaymentId,
  createProductId,
  createProductVariantId,
} from '../ids'
import { product, productVariant } from '../schema/catalog'
import { order, orderLine, payment } from '../schema/shopping'
import { confirmAndDecrementStock } from './payments'

const insertOrderAggregate = async (
  label: string,
  stockQuantities: number[],
  orderedQuantities: number[],
) => {
  const productId = createProductId()
  const variantIds = stockQuantities.map(() => createProductVariantId())
  const orderId = createOrderId()
  const telegramMessageId = `message-${label}`
  const now = Date.now()

  await db.batch([
    db.insert(product).values({
      id: productId,
      slug: `product-${label}`,
      name: `Product ${label}`,
      status: 'active',
      featured: false,
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(productVariant).values(
      variantIds.map((id, index) => ({
        id,
        productId,
        sku: `SKU-${label}-${index}`,
        name: `Variant ${index}`,
        priceMnt: 10_000,
        stockQuantity: stockQuantities[index]!,
        active: true,
        sortOrder: index,
        createdAt: now,
        updatedAt: now,
      })),
    ),
    db.insert(order).values({
      id: orderId,
      number: `ORDER-${label}`,
      statusTokenHash: `status-token-${label}`,
      status: 'new',
      customerName: 'Бат',
      customerPhone: '99112233',
      district: 'Баянзүрх',
      khoroo: '1-р хороо',
      address: 'Энхтайвны өргөн чөлөө',
      subtotalMnt: orderedQuantities.reduce((sum, quantity) => sum + quantity * 10_000, 0),
      deliveryFeeMnt: 5_000,
      totalMnt: orderedQuantities.reduce((sum, quantity) => sum + quantity * 10_000, 0) + 5_000,
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(orderLine).values(
      variantIds.map((variantId, index) => ({
        id: createOrderLineId(),
        orderId,
        productId,
        variantId,
        productName: `Product ${label}`,
        variantName: `Variant ${index}`,
        sku: `SKU-${label}-${index}`,
        options: {},
        unitPriceMnt: 10_000,
        quantity: orderedQuantities[index]!,
        lineTotalMnt: orderedQuantities[index]! * 10_000,
      })),
    ),
    db.insert(payment).values({
      id: createPaymentId(),
      orderId,
      method: 'bank_transfer',
      status: 'claimed',
      amountMnt: orderedQuantities.reduce((sum, quantity) => sum + quantity * 10_000, 0) + 5_000,
      claimedAt: now,
      telegramMessageId,
      createdAt: now,
      updatedAt: now,
    }),
  ])

  return { orderId, variantIds, telegramMessageId }
}

const readAggregateState = async (orderId: string, variantIds: string[]) => {
  const [variants, [currentOrder], [currentPayment]] = await Promise.all([
    db
      .select({ id: productVariant.id, stockQuantity: productVariant.stockQuantity })
      .from(productVariant)
      .where(inArray(productVariant.id, variantIds)),
    db.select({ status: order.status }).from(order).where(eq(order.id, orderId)),
    db
      .select({ status: payment.status, providerPaymentId: payment.providerPaymentId })
      .from(payment)
      .where(eq(payment.orderId, orderId)),
  ])

  return {
    stock: new Map(variants.map(variant => [variant.id, variant.stockQuantity])),
    order: currentOrder,
    payment: currentPayment,
  }
}

test('payment confirmation decrements stock once and keeps the order aggregate atomic', async () => {
  const successful = await insertOrderAggregate('successful', [5, 3], [2, 3])
  const paidAt = Date.now()
  const confirmation = await confirmAndDecrementStock({
    orderId: successful.orderId,
    providerPaymentId: 'telegram:successful',
    amountMnt: 55_000,
    method: 'bank_transfer',
    telegramMessageId: successful.telegramMessageId,
    paidAt,
  })

  expect(confirmation).toEqual({ status: 'confirmed', orderStatus: 'confirmed' })

  const confirmedState = await readAggregateState(successful.orderId, successful.variantIds)
  expect(successful.variantIds.map(id => confirmedState.stock.get(id))).toEqual([3, 0])
  expect(confirmedState.order?.status).toBe('confirmed')
  expect(confirmedState.payment).toEqual({
    status: 'paid',
    providerPaymentId: 'telegram:successful',
  })

  const repeated = await confirmAndDecrementStock({
    orderId: successful.orderId,
    providerPaymentId: 'telegram:successful',
    amountMnt: 55_000,
    method: 'bank_transfer',
    telegramMessageId: successful.telegramMessageId,
    paidAt: paidAt + 1,
  })
  expect(repeated).toEqual({
    status: 'already-paid',
    orderStatus: 'confirmed',
    stockApplied: true,
  })

  const repeatedState = await readAggregateState(successful.orderId, successful.variantIds)
  expect(successful.variantIds.map(id => repeatedState.stock.get(id))).toEqual([3, 0])

  const insufficient = await insertOrderAggregate('insufficient', [5, 1], [2, 2])
  const rejected = await confirmAndDecrementStock({
    orderId: insufficient.orderId,
    providerPaymentId: 'telegram:insufficient',
    amountMnt: 45_000,
    method: 'bank_transfer',
    telegramMessageId: insufficient.telegramMessageId,
    paidAt: paidAt + 2,
  })

  expect(rejected).toEqual({
    status: 'insufficient-stock',
    method: 'bank_transfer',
    paymentStatus: 'claimed',
    orderStatus: 'new',
    newlyPaid: false,
    variantIds: insufficient.variantIds,
  })

  const rejectedState = await readAggregateState(insufficient.orderId, insufficient.variantIds)
  expect(insufficient.variantIds.map(id => rejectedState.stock.get(id))).toEqual([5, 1])
  expect(rejectedState.order?.status).toBe('new')
  expect(rejectedState.payment).toEqual({ status: 'claimed', providerPaymentId: null })
})
