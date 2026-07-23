import { Result } from 'better-result'
import { env } from 'cloudflare:workers'
import ky from 'ky'

export type QPayError = { _tag: 'QPayUnavailable'; message: string }
export type QPayInvoice = {
  invoiceId: string
  qrText: string
  qrImage: string
  urls: { name: string; link: string }[]
}

const error = (): QPayError => ({
  _tag: 'QPayUnavailable',
  message: 'QPay төлбөрийг одоогоор бэлтгэх боломжгүй байна.',
})

const client = () => ky.create({ prefix: env.QPAY_BASE_URL || 'https://merchant.qpay.mn' })

const accessToken = async () => {
  const response: unknown = await client()
    .post('v2/auth/token', {
      headers: {
        authorization: `Basic ${btoa(`${env.QPAY_USERNAME}:${env.QPAY_PASSWORD}`)}`,
      },
    })
    .json()
  if (!response || typeof response !== 'object' || !('access_token' in response))
    throw new Error('Invalid provider response.')
  if (typeof response.access_token !== 'string') throw new Error('Invalid provider response.')
  return response.access_token
}

export const createQPayInvoice = async (input: {
  orderNumber: string
  amountMnt: number
  description: string
}) => {
  try {
    const token = await accessToken()
    const response: unknown = await client()
      .post('v2/invoice', {
        headers: { authorization: `Bearer ${token}` },
        json: {
          invoice_code: env.QPAY_INVOICE_CODE,
          sender_invoice_no: input.orderNumber,
          invoice_receiver_code: 'terminal',
          invoice_description: input.description,
          amount: input.amountMnt,
          callback_url: `${env.PUBLIC_APP_URL}/api/webhooks/qpay`,
        },
      })
      .json()
    if (!response || typeof response !== 'object') throw new Error('Invalid provider response.')
    const invoiceId = 'invoice_id' in response ? response.invoice_id : null
    const qrText = 'qr_text' in response ? response.qr_text : null
    const qrImage = 'qr_image' in response ? response.qr_image : null
    const rawUrls = 'urls' in response ? response.urls : []
    if (typeof invoiceId !== 'string' || typeof qrText !== 'string' || typeof qrImage !== 'string')
      throw new Error('Invalid provider response.')
    const urls = Array.isArray(rawUrls)
      ? rawUrls.flatMap(item => {
          if (!item || typeof item !== 'object') return []
          const name = 'name' in item ? item.name : null
          const link = 'link' in item ? item.link : null
          return typeof name === 'string' && typeof link === 'string' ? [{ name, link }] : []
        })
      : []
    return Result.ok<QPayInvoice, QPayError>({ invoiceId, qrText, qrImage, urls })
  } catch {
    return Result.err<QPayInvoice, QPayError>(error())
  }
}

export const verifyQPayCallback = async (paymentId: string) => {
  try {
    const token = await accessToken()
    const response: unknown = await client()
      .get(`v2/payment/${paymentId}`, { headers: { authorization: `Bearer ${token}` } })
      .json()
    if (!response || typeof response !== 'object') throw new Error('Invalid provider response.')
    const invoiceId = 'object_id' in response ? response.object_id : null
    const amount = 'payment_amount' in response ? response.payment_amount : null
    if (typeof invoiceId !== 'string' || typeof amount !== 'number')
      throw new Error('Invalid provider response.')
    return Result.ok({ invoiceId, paymentId, amountMnt: amount })
  } catch {
    return Result.err<null, QPayError>(error())
  }
}

export const verifyQPayPayment = async (invoiceId: string) => {
  try {
    const token = await accessToken()
    const response: unknown = await client()
      .post('v2/payment/check', {
        headers: { authorization: `Bearer ${token}` },
        json: { object_type: 'INVOICE', object_id: invoiceId },
      })
      .json()
    if (!response || typeof response !== 'object' || !('rows' in response))
      throw new Error('Invalid provider response.')
    if (!Array.isArray(response.rows) || response.rows.length === 0) return Result.ok(null)
    const row: unknown = response.rows[0]
    if (!row || typeof row !== 'object') throw new Error('Invalid provider response.')
    const id = 'payment_id' in row ? row.payment_id : null
    const amount = 'payment_amount' in row ? row.payment_amount : null
    if (typeof id !== 'string' || typeof amount !== 'number')
      throw new Error('Invalid provider response.')
    return Result.ok({ paymentId: id, amountMnt: amount })
  } catch {
    return Result.err<null, QPayError>(error())
  }
}
