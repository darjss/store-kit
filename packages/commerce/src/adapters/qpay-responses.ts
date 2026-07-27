import { Type } from 'typebox'
import type { Static, TSchema } from 'typebox'
import { Value } from 'typebox/value'

const tokenResponseSchema = Type.Object({
  access_token: Type.String({ minLength: 1 }),
  expires_in: Type.Number({ exclusiveMinimum: 0 }),
})

const invoiceResponseSchema = Type.Object({
  invoice_id: Type.String({ minLength: 1, maxLength: 200 }),
  qr_text: Type.String({ minLength: 1, maxLength: 4_096 }),
  qr_image: Type.String({ minLength: 1, maxLength: 524_288 }),
  urls: Type.Array(
    Type.Object({
      name: Type.String({ minLength: 1, maxLength: 100 }),
      link: Type.String({ minLength: 1, maxLength: 2_048 }),
    }),
    { maxItems: 30 },
  ),
})

const paymentCheckResponseSchema = Type.Object({
  count: Type.Number({ minimum: 0 }),
  rows: Type.Array(
    Type.Object({
      payment_id: Type.String({ minLength: 1 }),
      payment_status: Type.String({ minLength: 1 }),
      payment_amount: Type.Number({ minimum: 0 }),
    }),
  ),
})

type TokenResponse = Static<typeof tokenResponseSchema>
type InvoiceResponse = Static<typeof invoiceResponseSchema>
type PaymentCheckResponse = Static<typeof paymentCheckResponseSchema>

const parse = <Schema extends TSchema>(
  schema: Schema,
  input: unknown,
): Static<Schema> | undefined =>
  Value.Check(schema, input) ? Value.Parse(schema, input) : undefined

export const parseQPayTokenResponse = (input: unknown): TokenResponse | undefined =>
  parse(tokenResponseSchema, input)

const qpayDeepLinkSchemes = new Set([
  'ard:',
  'arig:',
  'bogdbank:',
  'capitronbank:',
  'ckbank:',
  'hipay:',
  'khanbank:',
  'mbank:',
  'monpay:',
  'most:',
  'nibank:',
  'payon:',
  'qpaywallet:',
  'socialpay-payment:',
  'sono:',
  'statebankmongolia:',
  'tdbbank:',
  'tdbwallet:',
  'tino:',
  'toki:',
  'transbank:',
  'xacbank:',
])

const validQPayLink = (link: string) => {
  try {
    const url = new URL(link)
    if (url.username || url.password || !url.hostname) return false
    if (url.protocol === 'https:') return true
    return qpayDeepLinkSchemes.has(url.protocol) && link.startsWith(`${url.protocol}//`)
  } catch {
    return false
  }
}

const qpayQrImage = (value: string) => {
  const image = value.startsWith('data:image/png;base64,')
    ? value
    : `data:image/png;base64,${value}`
  return image.length <= 524_288 && /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(image)
    ? image
    : undefined
}

export const parseQPayInvoiceResponse = (input: unknown): InvoiceResponse | undefined => {
  const invoice = parse(invoiceResponseSchema, input)
  if (!invoice || invoice.urls.some(({ link }) => !validQPayLink(link))) return undefined

  const qrImage = qpayQrImage(invoice.qr_image)
  if (!qrImage) return undefined
  return { ...invoice, qr_image: qrImage }
}

export const parseQPayPaymentCheckResponse = (input: unknown): PaymentCheckResponse | undefined =>
  parse(paymentCheckResponseSchema, input)
