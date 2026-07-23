import { Value } from 'typebox/value'
import { expect, test } from 'vite-plus/test'

import {
  createOrderId,
  createOrderLineId,
  createPaymentId,
  defaultCheckoutSettingsId,
} from '../ids'
import {
  insertCheckoutSettingsSchema,
  insertOrderLineSchema,
  insertOrderSchema,
  insertPaymentSchema,
} from './shopping'

const order = {
  id: createOrderId(),
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
  id: createOrderLineId(),
  orderId: order.id,
  productName: 'Aster',
  variantName: 'Graphite',
  sku: 'ASTER-GRAPHITE',
  options: { color: 'Graphite' },
  imageR2Key: 'products/aster/graphite.webp',
  imageWidth: 1200,
  imageHeight: 900,
  imageAlt: 'Aster Graphite',
  unitPriceMnt: 10_000,
  quantity: 1,
  lineTotalMnt: 10_000,
} as const

const payment = {
  id: createPaymentId(),
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
  expect(Value.Check(insertOrderSchema, { ...order, id: createPaymentId() })).toBe(false)
})

test('checkout settings require the singleton cfg TypeID when an ID is supplied', () => {
  const settings = {
    id: defaultCheckoutSettingsId,
    deliveryFeeMnt: 5_000,
    bankName: 'Bank',
    bankAccountName: 'Plugged',
    bankAccountNumber: '5000000000',
    updatedAt: 1,
  }

  expect(Value.Check(insertCheckoutSettingsSchema, settings)).toBe(true)
  expect(Value.Check(insertCheckoutSettingsSchema, { ...settings, id: createOrderId() })).toBe(
    false,
  )
})
