import { expect, test } from 'vite-plus/test'

import {
  parseQPayInvoiceResponse,
  parseQPayPaymentCheckResponse,
  parseQPayTokenResponse,
} from './qpay-responses'

test('parses documented QPay token and invoice response fields', () => {
  expect(
    parseQPayTokenResponse({
      access_token: 'access-token',
      expires_in: 300,
      token_type: 'Bearer',
    }),
  ).toEqual({ access_token: 'access-token', expires_in: 300, token_type: 'Bearer' })

  expect(
    parseQPayInvoiceResponse({
      invoice_id: 'invoice-1',
      qr_text: 'qr-text',
      qr_image: 'data:image/png;base64,AA==',
      urls: [{ name: 'Bank app', description: 'Open app', link: 'https://example.com/pay' }],
    }),
  ).toMatchObject({
    invoice_id: 'invoice-1',
    urls: [{ name: 'Bank app', link: 'https://example.com/pay' }],
  })
})

test('rejects invalid provider payloads before fields are read', () => {
  expect(parseQPayTokenResponse({ access_token: 'token' })).toBeUndefined()
  expect(
    parseQPayInvoiceResponse({
      invoice_id: 'invoice-1',
      qr_text: 'qr-text',
      qr_image: 'image',
      urls: [{ name: 'Bank app', link: 12 }],
    }),
  ).toBeUndefined()
})

test('parses documented payment check responses without exposing extra provider fields', () => {
  expect(
    parseQPayPaymentCheckResponse({
      count: 1,
      rows: [
        {
          payment_id: 'payment-1',
          payment_status: 'PAID',
          payment_amount: 1_000,
        },
      ],
    }),
  ).toMatchObject({ rows: [{ payment_id: 'payment-1', payment_status: 'PAID' }] })
})
