import { Result } from 'better-result'
import ky from 'ky'

const SANDBOX_URL = 'https://merchant-sandbox.qpay.mn'
const PRODUCTION_URL = 'https://merchant.qpay.mn'

export type QPayConfig = {
  clientId: string
  clientSecret: string
  invoiceCode: string
  environment: 'sandbox' | 'production'
}

export type QPayInvoiceInput = {
  orderNumber: string
  customerCode: string
  description: string
  amountMnt: number
  callbackUrl: string
}

export type QPayInvoice = {
  invoiceId: string
  qrText: string
  qrImage: string
  bankLinks: { name: string; description: string; logo: string; link: string }[]
}

export type QPayPaymentStatus =
  | { status: 'pending'; invoiceId: string }
  | {
      status: 'paid'
      invoiceId: string
      paymentId: string
      amountMnt: number
    }

export type QPayError = {
  _tag: 'QPayUnavailable' | 'QPayInvalidResponse' | 'QPayPaymentMismatch'
  message: string
  retryable: boolean
}

type PaidPayment = Extract<QPayPaymentStatus, { status: 'paid' }>
type QPayWebhookHook = (payment: PaidPayment) => void | Promise<void>

type Token = { value: string; expiresAt: number }

const unavailable = (): QPayError => ({
  _tag: 'QPayUnavailable',
  message: 'QPay үйлчилгээтэй холбогдож чадсангүй. Дахин оролдоно уу.',
  retryable: true,
})

const invalidResponse = (): QPayError => ({
  _tag: 'QPayInvalidResponse',
  message: 'QPay хариуг баталгаажуулж чадсангүй. Дахин оролдоно уу.',
  retryable: true,
})

const mismatch = (): QPayError => ({
  _tag: 'QPayPaymentMismatch',
  message: 'Төлбөрийн мэдээлэл тохирохгүй байна. Дэлгүүртэй холбогдоно уу.',
  retryable: false,
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const record = (value: unknown) => (isRecord(value) ? value : undefined)

const text = (value: unknown) => (typeof value === 'string' ? value : undefined)
const number = (value: unknown) => (typeof value === 'number' ? value : undefined)

const parseInvoice = (value: unknown): QPayInvoice | undefined => {
  const body = record(value)
  const invoiceId = text(body?.invoice_id)
  const qrText = text(body?.qr_text)
  const qrImage = text(body?.qr_image)
  if (!invoiceId || !qrText || !qrImage || !Array.isArray(body?.urls)) return

  const bankLinks = body.urls.flatMap(item => {
    const link = record(item)
    const name = text(link?.name)
    const description = text(link?.description)
    const logo = text(link?.logo)
    const url = text(link?.link)
    return name && description && logo && url ? [{ name, description, logo, link: url }] : []
  })

  return { invoiceId, qrText, qrImage, bankLinks }
}

const parsePayment = (invoiceId: string, value: unknown): QPayPaymentStatus | undefined => {
  const body = record(value)
  if (!body || !Array.isArray(body.rows)) return

  for (const item of body.rows) {
    const payment = record(item)
    if (text(payment?.payment_status) !== 'PAID') continue
    const paymentId = text(payment?.payment_id)
    const amountMnt = number(payment?.payment_amount)
    if (paymentId && amountMnt !== undefined) {
      return { status: 'paid', invoiceId, paymentId, amountMnt }
    }
  }

  return { status: 'pending', invoiceId }
}

export const validateQPayConfig = (config: QPayConfig) => {
  const missing = Object.entries(config)
    .filter(([, value]) => value.trim() === '')
    .map(([key]) => key)
  return missing.length === 0
    ? Result.ok(config)
    : Result.err<QPayConfig, { _tag: 'QPayNotConfigured'; missing: string[] }>({
        _tag: 'QPayNotConfigured',
        missing,
      })
}

export const createQPayAdapter = (config: QPayConfig) => {
  const baseUrl = config.environment === 'production' ? PRODUCTION_URL : SANDBOX_URL
  const client = ky.create({ prefix: `${baseUrl}/`, timeout: 10_000, retry: { limit: 1 } })
  let token: Token | undefined

  const accessToken = async () => {
    if (token && token.expiresAt > Date.now() + 30_000) return token.value

    const authorization = btoa(`${config.clientId}:${config.clientSecret}`)
    const response: unknown = await client
      .post('v2/auth/token', { headers: { authorization: `Basic ${authorization}` } })
      .json()
    const body = record(response)
    const value = text(body?.access_token)
    const expiresIn = number(body?.expires_in)
    if (!value || expiresIn === undefined) throw new Error('Invalid QPay token response')

    token = { value, expiresAt: Date.now() + expiresIn * 1_000 }
    return value
  }

  const authorizedPost = async (path: string, json: object) => {
    const bearer = await accessToken()
    return client
      .post(path, { headers: { authorization: `Bearer ${bearer}` }, json })
      .json<unknown>()
  }

  const createInvoice = async (input: QPayInvoiceInput) => {
    try {
      const response = await authorizedPost('v2/invoice', {
        invoice_code: config.invoiceCode,
        sender_invoice_no: input.orderNumber,
        invoice_receiver_code: input.customerCode,
        invoice_description: input.description,
        amount: input.amountMnt,
        callback_url: input.callbackUrl,
      })
      const invoice = parseInvoice(response)
      return invoice
        ? Result.ok<QPayInvoice, QPayError>(invoice)
        : Result.err<QPayInvoice, QPayError>(invalidResponse())
    } catch {
      return Result.err<QPayInvoice, QPayError>(unavailable())
    }
  }

  const inspectPayment = async (invoiceId: string) => {
    try {
      const response = await authorizedPost('v2/payment/check', {
        object_type: 'INVOICE',
        object_id: invoiceId,
        offset: { page_number: 1, page_limit: 100 },
      })
      const payment = parsePayment(invoiceId, response)
      return payment
        ? Result.ok<QPayPaymentStatus, QPayError>(payment)
        : Result.err<QPayPaymentStatus, QPayError>(invalidResponse())
    } catch {
      return Result.err<QPayPaymentStatus, QPayError>(unavailable())
    }
  }

  const handleWebhook = async (
    invoiceId: string,
    expectedAmountMnt: number,
    hook: QPayWebhookHook,
  ) => {
    const result = await inspectPayment(invoiceId)
    if (result.isErr() || result.value.status === 'pending') return result
    if (result.value.amountMnt !== expectedAmountMnt) {
      return Result.err<QPayPaymentStatus, QPayError>(mismatch())
    }

    await hook(result.value)
    return result
  }

  return { createInvoice, inspectPayment, handleWebhook }
}
