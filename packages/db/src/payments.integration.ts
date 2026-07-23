import type { OrderStatus } from '@store-kit/contracts/orders'
import type { PaymentMethod, PaymentStatus } from '@store-kit/contracts/payments'
import { eq, inArray } from 'drizzle-orm'
import { describe, expect, it } from 'vite-plus/test'

import { db } from './client'
import {
  createOrderId,
  createOrderLineId,
  createPaymentId,
  createProductId,
  createProductVariantId,
} from './ids'
import { paymentQuery } from './queries/payments'
import { product, productVariant } from './schema/catalog'
import { order, orderLine, payment } from './schema/shopping'

type FixtureOptions = {
  method?: PaymentMethod
  orderStatus?: OrderStatus
  paymentStatus?: PaymentStatus
  stocks?: number[]
  quantities?: number[]
  telegramMessageId?: string | null
}

const createFixture = async ({
  method = 'bank_transfer',
  orderStatus = 'new',
  paymentStatus = method === 'bank_transfer' ? 'claimed' : 'pending',
  stocks = [5],
  quantities = stocks.map(() => 1),
  telegramMessageId = method === 'bank_transfer' ? '100' : null,
}: FixtureOptions = {}) => {
  const now = Date.now()
  const orderId = createOrderId()
  const paymentId = createPaymentId()
  const productId = createProductId()
  const variantIds = stocks.map(() => createProductVariantId())
  const subtotalMnt = quantities.reduce((sum, quantity) => sum + quantity * 1_000, 0)

  await db.batch([
    db.insert(product).values({
      id: productId,
      slug: `product-${productId}`,
      name: `Product ${productId}`,
      status: 'active',
      featured: false,
      useCases: [],
      createdAt: now,
      updatedAt: now,
    }),
    ...variantIds.map((variantId, index) =>
      db.insert(productVariant).values({
        id: variantId,
        productId,
        sku: `SKU-${variantId}`,
        name: `Variant ${index}`,
        options: {},
        priceMnt: 1_000,
        stockQuantity: stocks[index]!,
        active: true,
        sortOrder: index,
        createdAt: now,
        updatedAt: now,
      }),
    ),
    db.insert(order).values({
      id: orderId,
      number: `ORDER-${orderId}`,
      statusTokenHash: `hash-${orderId}`,
      status: orderStatus,
      customerName: 'Test Customer',
      customerPhone: '99112233',
      district: 'Сүхбаатар',
      khoroo: '1',
      address: 'Test address',
      deliveryNotes: null,
      subtotalMnt,
      deliveryFeeMnt: 0,
      totalMnt: subtotalMnt,
      createdAt: now,
      updatedAt: now,
    }),
    ...variantIds.map((variantId, index) =>
      db.insert(orderLine).values({
        id: createOrderLineId(),
        orderId,
        productId,
        variantId,
        productName: 'Test Product',
        variantName: `Variant ${index}`,
        sku: `SKU-${variantId}`,
        options: {},
        imageR2Key: null,
        unitPriceMnt: 1_000,
        quantity: quantities[index]!,
        lineTotalMnt: quantities[index]! * 1_000,
      }),
    ),
    db.insert(payment).values({
      id: paymentId,
      orderId,
      method,
      status: paymentStatus,
      amountMnt: subtotalMnt,
      providerInvoiceId: method === 'qpay' ? `invoice-${paymentId}` : null,
      providerPaymentId: null,
      claimedAt: paymentStatus === 'claimed' ? now : null,
      telegramMessageId,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    }),
  ])

  return { orderId, paymentId, variantIds, amountMnt: subtotalMnt }
}

const readState = async (orderId: string, variantIds: string[]) => {
  const [orders, payments, variants] = await db.batch([
    db.select().from(order).where(eq(order.id, orderId)),
    db.select().from(payment).where(eq(payment.orderId, orderId)),
    db.select().from(productVariant).where(inArray(productVariant.id, variantIds)),
  ])
  return { order: orders[0]!, payment: payments[0]!, variants }
}

describe('atomic payment confirmation', () => {
  it('does not claim payment or decrement stock for a cancelled order', async () => {
    const fixture = await createFixture({
      method: 'qpay',
      orderStatus: 'cancelled',
      paymentStatus: 'pending',
      stocks: [5],
      quantities: [2],
    })

    const result = await paymentQuery.confirmAndDecrementStock({
      orderId: fixture.orderId,
      providerPaymentId: 'qpay-cancelled',
      amountMnt: fixture.amountMnt,
      method: 'qpay',
      paidAt: Date.now(),
    })
    const state = await readState(fixture.orderId, fixture.variantIds)

    expect(result).toEqual({ status: 'payment-mismatch' })
    expect(state.order.status).toBe('cancelled')
    expect(state.payment.status).toBe('pending')
    expect(state.variants.map(variant => variant.stockQuantity)).toEqual([5])
  })

  it('inspects and persists every successful stock decrement exactly once', async () => {
    const fixture = await createFixture({
      stocks: [5, 3],
      quantities: [2, 1],
      telegramMessageId: '200',
    })
    const input = {
      orderId: fixture.orderId,
      providerPaymentId: 'telegram:confirm-1',
      amountMnt: fixture.amountMnt,
      method: 'bank_transfer' as const,
      telegramMessageId: '200',
      paidAt: Date.now(),
    }

    const first = await paymentQuery.confirmAndDecrementStock(input)
    const repeated = await paymentQuery.confirmAndDecrementStock({
      ...input,
      providerPaymentId: 'telegram:confirm-2',
    })
    const state = await readState(fixture.orderId, fixture.variantIds)

    expect(first).toEqual({ status: 'confirmed', orderStatus: 'confirmed' })
    expect(repeated).toEqual({
      status: 'already-paid',
      orderStatus: 'confirmed',
      stockApplied: true,
    })
    expect(state.order.status).toBe('confirmed')
    expect(state.payment.status).toBe('paid')
    expect(state.variants.map(variant => variant.stockQuantity).toSorted()).toEqual([2, 3])
  })

  it('keeps a bank claim and all stock unchanged when any variant is short', async () => {
    const fixture = await createFixture({
      stocks: [5, 1],
      quantities: [2, 2],
      telegramMessageId: '300',
    })

    const result = await paymentQuery.confirmAndDecrementStock({
      orderId: fixture.orderId,
      providerPaymentId: 'telegram:short',
      amountMnt: fixture.amountMnt,
      method: 'bank_transfer',
      telegramMessageId: '300',
      paidAt: Date.now(),
    })
    const state = await readState(fixture.orderId, fixture.variantIds)

    expect(result).toMatchObject({
      status: 'insufficient-stock',
      method: 'bank_transfer',
      paymentStatus: 'claimed',
      orderStatus: 'new',
      newlyPaid: false,
    })
    expect(state.payment.status).toBe('claimed')
    expect(state.order.status).toBe('new')
    expect(state.variants.map(variant => variant.stockQuantity).toSorted()).toEqual([1, 5])
  })

  it('checks the aggregate quantity for every variant before any decrement', async () => {
    const fixture = await createFixture({
      stocks: [5],
      quantities: [2],
      telegramMessageId: '301',
    })
    await db.insert(orderLine).values({
      id: createOrderLineId(),
      orderId: fixture.orderId,
      productId: null,
      variantId: fixture.variantIds[0],
      productName: 'Duplicate data guard',
      variantName: 'Default',
      sku: 'DUPLICATE-DATA-GUARD',
      options: {},
      imageR2Key: null,
      unitPriceMnt: 0,
      quantity: 4,
      lineTotalMnt: 0,
    })

    const result = await paymentQuery.confirmAndDecrementStock({
      orderId: fixture.orderId,
      providerPaymentId: 'telegram:aggregate-short',
      amountMnt: fixture.amountMnt,
      method: 'bank_transfer',
      telegramMessageId: '301',
      paidAt: Date.now(),
    })
    const state = await readState(fixture.orderId, fixture.variantIds)

    expect(result).toMatchObject({
      status: 'insufficient-stock',
      paymentStatus: 'claimed',
      orderStatus: 'new',
    })
    expect(state.variants[0]!.stockQuantity).toBe(5)
    expect(state.payment.status).toBe('claimed')
  })

  it('records an already-received QPay payment without decrementing short stock', async () => {
    const fixture = await createFixture({
      method: 'qpay',
      stocks: [1],
      quantities: [2],
    })

    const result = await paymentQuery.confirmAndDecrementStock({
      orderId: fixture.orderId,
      providerPaymentId: 'qpay-paid-short',
      amountMnt: fixture.amountMnt,
      method: 'qpay',
      paidAt: Date.now(),
    })
    const state = await readState(fixture.orderId, fixture.variantIds)

    expect(result).toMatchObject({
      status: 'insufficient-stock',
      method: 'qpay',
      paymentStatus: 'paid',
      orderStatus: 'new',
      newlyPaid: true,
    })
    expect(state.payment.status).toBe('paid')
    expect(state.order.status).toBe('new')
    expect(state.variants[0]!.stockQuantity).toBe(1)
  })
})

describe('bank-transfer claim and callback ownership', () => {
  it('allows only one concurrent pending-to-claimed request to own notification sending', async () => {
    const fixture = await createFixture({
      paymentStatus: 'pending',
      telegramMessageId: null,
    })

    const claims = await Promise.all(
      Array.from({ length: 4 }, () =>
        paymentQuery.markBankTransferClaimed(fixture.orderId, Date.now()),
      ),
    )
    const persisted = await paymentQuery.findByOrderId(fixture.orderId)

    expect(claims.filter(Boolean)).toHaveLength(1)
    expect(persisted?.status).toBe('claimed')
  })

  it('binds transitions to the current message and reflects reordered and repeated state', async () => {
    const fixture = await createFixture({ telegramMessageId: 'old-message' })

    const rejected = await paymentQuery.rejectBankTransferClaim(
      fixture.orderId,
      'old-message',
      Date.now(),
    )
    const repeatedReject = await paymentQuery.rejectBankTransferClaim(
      fixture.orderId,
      'old-message',
      Date.now(),
    )
    const reorderedConfirm = await paymentQuery.confirmAndDecrementStock({
      orderId: fixture.orderId,
      providerPaymentId: 'telegram:after-reject',
      amountMnt: fixture.amountMnt,
      method: 'bank_transfer',
      telegramMessageId: 'old-message',
      paidAt: Date.now(),
    })

    expect(rejected).toMatchObject({
      transitioned: true,
      persisted: { paymentStatus: 'pending', telegramMessageId: null },
    })
    expect(repeatedReject).toMatchObject({
      transitioned: false,
      persisted: { paymentStatus: 'pending', telegramMessageId: null },
    })
    expect(reorderedConfirm).toEqual({ status: 'payment-mismatch' })

    expect(await paymentQuery.markBankTransferClaimed(fixture.orderId, Date.now())).toBeDefined()
    expect(
      await paymentQuery.storeTelegramMessageId(fixture.orderId, 'new-message', Date.now()),
    ).toBeDefined()

    const oldReject = await paymentQuery.rejectBankTransferClaim(
      fixture.orderId,
      'old-message',
      Date.now(),
    )
    const oldConfirm = await paymentQuery.confirmAndDecrementStock({
      orderId: fixture.orderId,
      providerPaymentId: 'telegram:old-message',
      amountMnt: fixture.amountMnt,
      method: 'bank_transfer',
      telegramMessageId: 'old-message',
      paidAt: Date.now(),
    })
    const currentConfirm = await paymentQuery.confirmAndDecrementStock({
      orderId: fixture.orderId,
      providerPaymentId: 'telegram:new-message',
      amountMnt: fixture.amountMnt,
      method: 'bank_transfer',
      telegramMessageId: 'new-message',
      paidAt: Date.now(),
    })
    const repeatedConfirm = await paymentQuery.confirmAndDecrementStock({
      orderId: fixture.orderId,
      providerPaymentId: 'telegram:repeat',
      amountMnt: fixture.amountMnt,
      method: 'bank_transfer',
      telegramMessageId: 'new-message',
      paidAt: Date.now(),
    })

    expect(oldReject).toMatchObject({
      transitioned: false,
      persisted: { paymentStatus: 'claimed', telegramMessageId: 'new-message' },
    })
    expect(oldConfirm).toEqual({ status: 'payment-mismatch' })
    expect(currentConfirm).toEqual({ status: 'confirmed', orderStatus: 'confirmed' })
    expect(repeatedConfirm).toEqual({
      status: 'already-paid',
      orderStatus: 'confirmed',
      stockApplied: true,
    })
  })
})
