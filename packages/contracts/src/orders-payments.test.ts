import { Value } from 'typebox/value'
import { expect, test } from 'vite-plus/test'

import { publicOrderSchema } from './orders'
import {
  bankTransferClaimErrorSchema,
  paymentConfirmationErrorSchema,
  paymentRefreshErrorSchema,
  paymentConfirmationSchema,
} from './payments'
import { privateOrderErrorSchema } from './private-orders'

const publicOrder = {
  id: 'ord_01arz3ndektsv4rrffq69g5fav',
  number: 'PLG-1001',
  status: 'confirmed',
  customerName: 'Бат',
  customerPhone: '99112233',
  district: 'Баянзүрх',
  khoroo: '1',
  address: 'Энхтайвны өргөн чөлөө',
  deliveryNotes: null,
  subtotalMnt: 120_000,
  deliveryFeeMnt: 5_000,
  totalMnt: 125_000,
  createdAt: 1_721_000_000_000,
  updatedAt: 1_721_000_001_000,
  lines: [
    {
      productName: 'First IEM',
      variantName: 'Black',
      sku: 'IEM-BLACK',
      options: { color: 'Black' },
      image: {
        url: 'https://media.example.com/products/first-iem/black.webp',
        width: 1200,
        height: 900,
        alt: 'Black First IEM',
      },
      unitPriceMnt: 120_000,
      quantity: 1,
      lineTotalMnt: 120_000,
    },
  ],
  payment: {
    method: 'qpay',
    status: 'paid',
    amountMnt: 125_000,
    claimedAt: null,
    paidAt: 1_721_000_001_000,
  },
} as const

test('public order status accepts the customer view and rejects persistence secrets', () => {
  expect(Value.Check(publicOrderSchema, publicOrder)).toBe(true)
  expect(
    Value.Check(publicOrderSchema, {
      ...publicOrder,
      statusTokenHash: 'private-hash',
    }),
  ).toBe(false)
  expect(
    Value.Check(publicOrderSchema, {
      ...publicOrder,
      payment: { ...publicOrder.payment, providerPaymentId: 'provider-secret' },
    }),
  ).toBe(false)
  expect(
    Value.Check(publicOrderSchema, {
      ...publicOrder,
      lines: [{ ...publicOrder.lines[0], imageR2Key: 'catalog/private-key.webp' }],
    }),
  ).toBe(false)
})

test('public order and payment failures remain plain tagged data', () => {
  expect(
    Value.Check(privateOrderErrorSchema, {
      _tag: 'InvalidStatusToken',
      message: 'Захиалга олдсонгүй.',
    }),
  ).toBe(true)
  expect(
    Value.Check(bankTransferClaimErrorSchema, {
      _tag: 'BankTransferClaimNotAllowed',
      message: 'Энэ төлбөрт мэдэгдэл өгөх боломжгүй.',
      paymentStatus: 'failed',
    }),
  ).toBe(true)
  expect(
    Value.Check(paymentRefreshErrorSchema, {
      _tag: 'PaymentVerificationFailed',
      message: 'Төлбөр шалгаж чадсангүй.',
      retryable: true,
    }),
  ).toBe(true)
  expect(
    Value.Check(paymentConfirmationErrorSchema, {
      _tag: 'InsufficientStock',
      message: 'Үлдэгдэл хүрэлцэхгүй.',
      variantIds: ['var_01arz3ndektsv4rrffq69g5fav'],
    }),
  ).toBe(true)
})

test('payment confirmation exposes the public idempotency outcome', () => {
  const confirmation = {
    orderId: publicOrder.id,
    paymentStatus: 'paid',
    orderStatus: 'confirmed',
    stockApplied: true,
    needsStaffAction: false,
    newlyPaid: true,
  } as const

  expect(Value.Check(paymentConfirmationSchema, confirmation)).toBe(true)
  expect(
    Value.Check(paymentConfirmationSchema, { ...confirmation, providerPaymentId: 'private' }),
  ).toBe(false)
})
