import { expect, test } from 'vite-plus/test'

import type { CheckoutDomainError } from './checkout'
import { checkoutDomainActions, normalizeCheckoutDetails } from './checkout'

test('normalizes typed checkout form values before browser submission', () => {
  expect(
    normalizeCheckoutDetails({
      customer: { name: '  Бат  ', phone: '+976 9911-2233' },
      delivery: {
        district: 'Сүхбаатар',
        khoroo: '  1-р хороо  ',
        address: '  Энхтайвны өргөн чөлөө  ',
        notes: '   ',
      },
      paymentMethod: 'qpay',
    }),
  ).toEqual({
    customer: { name: 'Бат', phone: '99112233' },
    delivery: {
      district: 'Сүхбаатар',
      khoroo: '1-р хороо',
      address: 'Энхтайвны өргөн чөлөө',
    },
    paymentMethod: 'qpay',
  })
})

test('maps every checkout domain error to exhaustive correction actions', () => {
  const errors: CheckoutDomainError[] = [
    { _tag: 'CartEmpty', message: 'Empty' },
    { _tag: 'CartChanged', corrections: [] },
    { _tag: 'InvalidCart', fields: [] },
    { _tag: 'InvalidCheckoutDetails', fields: [] },
    { _tag: 'DeliveryUnavailable', message: 'Unavailable' },
    { _tag: 'PaymentSetupFailed', message: 'Failed', canUseBankTransfer: false },
    { _tag: 'PaymentSetupFailed', message: 'Failed', canUseBankTransfer: true },
  ]

  expect(errors.map(error => checkoutDomainActions(error))).toEqual([
    [],
    ['open-cart'],
    ['open-cart'],
    [],
    [],
    ['retry'],
    ['retry', 'use-bank-transfer'],
  ])
})
