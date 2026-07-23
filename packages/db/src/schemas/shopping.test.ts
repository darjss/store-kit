import { Value } from 'typebox/value'
import { expect, test } from 'vite-plus/test'

import {
  cartLineInputsSchema,
  insertOrderLineSchema,
  persistedCartItemSchema,
  insertOrderSchema,
  insertPaymentSchema,
} from './shopping'

const order = {
  id: 'order-1',
  number: 'P-1001',
  statusTokenHash: 'hash',
  status: 'new',
  customerName: 'Bat',
  customerPhone: '99112233',
  district: 'Bayanzurkh',
  khoroo: '1',
  address: 'Peace Avenue',
  subtotalMnt: 10_000,
  deliveryFeeMnt: 5_000,
  totalMnt: 15_000,
  createdAt: 1,
  updatedAt: 1,
} as const

const line = {
  id: 'line-1',
  orderId: order.id,
  productName: 'Aster',
  variantName: 'Graphite',
  sku: 'ASTER-GRAPHITE',
  options: { color: 'Graphite' },
  unitPriceMnt: 10_000,
  quantity: 1,
  lineTotalMnt: 10_000,
} as const

const payment = {
  id: 'payment-1',
  orderId: order.id,
  method: 'bank_transfer',
  status: 'pending',
  amountMnt: 15_000,
  createdAt: 1,
  updatedAt: 1,
} as const

test('shopping schemas accept integer MNT snapshots and controlled states', () => {
  expect(Value.Check(insertOrderSchema, order)).toBe(true)
  expect(Value.Check(insertOrderLineSchema, line)).toBe(true)
  expect(Value.Check(insertPaymentSchema, payment)).toBe(true)
  expect(Value.Check(insertPaymentSchema, { ...payment, method: 'cash' })).toBe(false)
  expect(Value.Check(insertPaymentSchema, { ...payment, amountMnt: 10.5 })).toBe(false)
})

test('cart input limits line count and quantity', () => {
  expect(Value.Check(cartLineInputsSchema, [{ variantId: 'variant-1', quantity: 1 }])).toBe(true)
  expect(Value.Check(cartLineInputsSchema, [{ variantId: 'variant-1', quantity: 11 }])).toBe(false)
  expect(Value.Check(cartLineInputsSchema, [])).toBe(false)
})

test('persisted cart items contain only the allowed display snapshot', () => {
  const item = {
    variantId: 'variant-1',
    quantity: 2,
    productSlug: 'first-iem',
    productName: 'First IEM',
    variantName: 'Black',
    options: { color: 'Black' },
    imageR2Key: 'products/first-iem/black.webp',
    unitPriceMnt: 120_000,
  }

  expect(Value.Check(persistedCartItemSchema, item)).toBe(true)
  expect(Value.Check(persistedCartItemSchema, { ...item, unitPriceMnt: -1 })).toBe(false)
  expect(Value.Check(persistedCartItemSchema, { ...item, stockQuantity: 3 })).toBe(false)
})
