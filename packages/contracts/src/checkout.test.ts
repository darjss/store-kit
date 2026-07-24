import { Value } from 'typebox/value'
import { expect, test } from 'vite-plus/test'

import {
  checkoutCreatedSchema,
  checkoutDetailsSchema,
  checkoutErrorSchema,
  checkoutInputSchema,
  paymentInstructionsSchema,
} from './checkout'
import { toStandardSchema } from './standard-schema'

const checkout = {
  items: [{ variantId: 'var_01arz3ndektsv4rrffq69g5fav', quantity: 1 }],
  customer: { name: 'Бат', phone: '99112233' },
  delivery: {
    district: 'Баянзүрх',
    khoroo: '1-р хороо',
    address: 'Энхтайвны өргөн чөлөө',
  },
  paymentMethod: 'bank_transfer',
} as const

test('checkout composes browser details with authoritative cart items', () => {
  const details = {
    customer: checkout.customer,
    delivery: checkout.delivery,
    paymentMethod: checkout.paymentMethod,
  }

  expect(Value.Check(checkoutDetailsSchema, details)).toBe(true)
  expect(Value.Check(checkoutDetailsSchema, checkout)).toBe(false)
  expect(Value.Check(checkoutInputSchema, checkout)).toBe(true)
  expect(
    Value.Check(checkoutInputSchema, {
      ...checkout,
      delivery: { ...checkout.delivery, district: 'Дархан' },
    }),
  ).toBe(false)
  expect(Value.Check(checkoutInputSchema, { ...checkout, totalMnt: 1 })).toBe(false)
})

test.each([
  ['customer name', { ...checkout, customer: { ...checkout.customer, name: ' \t ' } }],
  ['khoroo', { ...checkout, delivery: { ...checkout.delivery, khoroo: '\n ' } }],
  ['address', { ...checkout, delivery: { ...checkout.delivery, address: '   ' } }],
])('checkout rejects a whitespace-only required %s', (_label, input) => {
  expect(Value.Check(checkoutInputSchema, input)).toBe(false)
})

test.each(['55112233', '9911223', '991122334', '+976 9911-2233', '9911 2233'])(
  'checkout rejects the non-normalized or invalid Mongolian phone %s',
  phone => {
    expect(
      Value.Check(checkoutInputSchema, {
        ...checkout,
        customer: { ...checkout.customer, phone },
      }),
    ).toBe(false)
  },
)

test('checkout Standard Schema validation reports the shared nested field paths', () => {
  const result = toStandardSchema(checkoutDetailsSchema)['~standard'].validate({
    customer: { name: 'Бат', phone: '55112233' },
    delivery: {
      district: 'Баянзүрх',
      khoroo: ' ',
      address: 'Энхтайвны өргөн чөлөө',
    },
    paymentMethod: 'bank_transfer',
  })

  expect(result).toMatchObject({
    issues: [{ path: ['customer', 'phone'] }, { path: ['delivery', 'khoroo'] }],
  })
})

test('checkout result exposes only serialized customer payment instructions', () => {
  const nextAction = {
    type: 'qpay',
    qrText: 'qpay-qr-text',
    qrImage: 'data:image/png;base64,AA==',
    urls: [{ name: 'Bank app', link: 'https://example.com/qpay' }],
  } as const
  const created = {
    orderId: 'ord_01arz3ndektsv4rrffq69g5fav',
    orderNumber: 'PLG-1001',
    statusToken: 'private-status-token',
    nextAction,
  } as const

  expect(Value.Check(paymentInstructionsSchema, nextAction)).toBe(true)
  expect(
    Value.Check(paymentInstructionsSchema, {
      type: 'bank_transfer',
      bankName: 'Example Bank',
      accountName: 'Plugged',
      accountNumber: '1234567890',
    }),
  ).toBe(true)
  expect(Value.Check(checkoutCreatedSchema, created)).toBe(true)
  expect(Value.Check(checkoutCreatedSchema, { ...created, orderId: 'order-1' })).toBe(false)
  expect(
    Value.Check(checkoutCreatedSchema, {
      ...created,
      orderId: 'ord_81arz3ndektsv4rrffq69g5fav',
    }),
  ).toBe(false)
  expect(
    Value.Check(checkoutCreatedSchema, {
      ...created,
      nextAction: { ...nextAction, providerInvoiceId: 'private-provider-id' },
    }),
  ).toBe(false)
})

test('checkout failures preserve tagged correction and field details', () => {
  expect(
    Value.Check(checkoutErrorSchema, {
      _tag: 'InvalidCheckoutDetails',
      fields: [{ path: '/customer/phone', code: 'invalid' }],
    }),
  ).toBe(true)
  expect(
    Value.Check(checkoutErrorSchema, {
      _tag: 'InvalidCheckoutDetails',
      fields: [{ path: '/customer/phone', code: 'invalid', message: 'Presentation text' }],
    }),
  ).toBe(false)
  expect(
    Value.Check(checkoutErrorSchema, {
      _tag: 'PaymentSetupFailed',
      message: 'Төлбөрийн хүсэлт амжилтгүй.',
      canUseBankTransfer: true,
      providerBody: { token: 'secret' },
    }),
  ).toBe(false)
})
