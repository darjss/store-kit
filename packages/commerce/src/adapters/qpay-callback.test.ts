import { expect, test } from 'vite-plus/test'

import { createQPayCallbackUrl, qpayPaymentCheckBody } from './qpay-callback'

test('QPay invoice callback carries the local payment lookup identifier in the documented query', () => {
  expect(createQPayCallbackUrl('https://plugged.mn/store', 'pay_01lookup')).toBe(
    'https://plugged.mn/api/webhooks/qpay?payment_id=pay_01lookup',
  )
  expect(createQPayCallbackUrl('https://plugged.mn', 'pay_1+2/3')).toBe(
    'https://plugged.mn/api/webhooks/qpay?payment_id=pay_1%2B2%2F3',
  )
})

test('QPay payment check uses the stored invoice identifier and documented pagination shape', () => {
  expect(qpayPaymentCheckBody('invoice-from-create-response')).toEqual({
    object_type: 'INVOICE',
    object_id: 'invoice-from-create-response',
    offset: { page_number: 1, page_limit: 100 },
  })
})
