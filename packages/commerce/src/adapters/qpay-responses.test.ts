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

  const invoice = parseQPayInvoiceResponse({
    invoice_id: 'invoice-1',
    qr_text: 'qr-text',
    qr_image: 'AA==',
    urls: [{ name: 'Bank app', description: 'Open app', link: 'https://example.com/pay' }],
  })

  expect(invoice).toMatchObject({
    invoice_id: 'invoice-1',
    qr_image: 'data:image/png;base64,AA==',
    urls: [{ name: 'Bank app', link: 'https://example.com/pay' }],
  })
  expect(
    parseQPayInvoiceResponse({
      invoice_id: 'invoice-2',
      qr_text: 'qr-text',
      qr_image: 'data:image/png;base64,AA==',
      urls: [{ name: 'Bank app', description: 'Open app', link: 'https://example.com/pay' }],
    }),
  ).toMatchObject({
    invoice_id: 'invoice-2',
    qr_image: 'data:image/png;base64,AA==',
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

test.each([
  'javascript:alert(document.domain)',
  'data:text/html,unsafe',
  'http://bank.example/pay',
  'https://user:password@bank.example/pay',
  'unknown-wallet://q?data=payment',
])('rejects hostile QPay invoice links from the real adapter boundary: %s', link => {
  expect(
    parseQPayInvoiceResponse({
      invoice_id: 'invoice-hostile',
      qr_text: 'qr-text',
      qr_image: 'AA==',
      urls: [{ name: 'Bank app', link }],
    }),
  ).toBeUndefined()
})

test('accepts current QPay bank schemes and rejects unbounded QR payloads', () => {
  expect(
    parseQPayInvoiceResponse({
      invoice_id: 'invoice-bank-links',
      qr_text: 'qr-text',
      qr_image: 'AA==',
      urls: [
        { name: 'Khan Bank', link: 'khanbank://q?qPay_QRcode=value' },
        { name: 'SocialPay', link: 'socialpay-payment://q?qPay_QRcode=value' },
        { name: 'QPay web', link: 'https://qpay.mn/q/value' },
      ],
    }),
  ).toMatchObject({ invoice_id: 'invoice-bank-links' })
  expect(
    parseQPayInvoiceResponse({
      invoice_id: 'invoice-large-qr',
      qr_text: 'x'.repeat(4_097),
      qr_image: 'AA==',
      urls: [],
    }),
  ).toBeUndefined()
  expect(
    parseQPayInvoiceResponse({
      invoice_id: 'invoice-large-image',
      qr_text: 'qr-text',
      qr_image: 'A'.repeat(524_289),
      urls: [],
    }),
  ).toBeUndefined()
  expect(
    parseQPayInvoiceResponse({
      invoice_id: 'invoice-svg-image',
      qr_text: 'qr-text',
      qr_image: 'data:image/svg+xml;base64,PHN2Zy8+',
      urls: [],
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
