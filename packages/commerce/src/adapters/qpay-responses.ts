import { Type } from 'typebox'
import type { Static, TSchema } from 'typebox'
import { Value } from 'typebox/value'

const tokenResponseSchema = Type.Object({
  access_token: Type.String({ minLength: 1 }),
  expires_in: Type.Number({ exclusiveMinimum: 0 }),
})

const invoiceResponseSchema = Type.Object({
  invoice_id: Type.String({ minLength: 1 }),
  qr_text: Type.String({ minLength: 1 }),
  qr_image: Type.String({ minLength: 1 }),
  urls: Type.Array(
    Type.Object({
      name: Type.String({ minLength: 1 }),
      link: Type.String({ minLength: 1 }),
    }),
  ),
})

const paymentResponseSchema = Type.Object({
  payment_id: Type.String({ minLength: 1 }),
  payment_status: Type.String({ minLength: 1 }),
  payment_amount: Type.Number({ minimum: 0 }),
  object_id: Type.String({ minLength: 1 }),
})

const paymentCheckResponseSchema = Type.Object({
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
type PaymentResponse = Static<typeof paymentResponseSchema>
type PaymentCheckResponse = Static<typeof paymentCheckResponseSchema>

const parse = <Schema extends TSchema>(
  schema: Schema,
  input: unknown,
): Static<Schema> | undefined =>
  Value.Check(schema, input) ? Value.Parse(schema, input) : undefined

export const parseQPayTokenResponse = (input: unknown): TokenResponse | undefined =>
  parse(tokenResponseSchema, input)

export const parseQPayInvoiceResponse = (input: unknown): InvoiceResponse | undefined =>
  parse(invoiceResponseSchema, input)

export const parseQPayPaymentResponse = (input: unknown): PaymentResponse | undefined =>
  parse(paymentResponseSchema, input)

export const parseQPayPaymentCheckResponse = (input: unknown): PaymentCheckResponse | undefined =>
  parse(paymentCheckResponseSchema, input)
