import { Result } from 'better-result'
import { env } from 'cloudflare:workers'
import ky from 'ky'
import type { KyInstance } from 'ky'

import { createQPayCallbackUrl, qpayPaymentCheckBody } from './qpay-callback'
import {
  parseQPayInvoiceResponse,
  parseQPayPaymentCheckResponse,
  parseQPayTokenResponse,
} from './qpay-responses'
import { createQPayTokenCache } from './qpay-token-cache'

export { createQPayCallbackUrl, qpayPaymentCheckBody } from './qpay-callback'

export type QPayError =
  | { _tag: 'QPayRequestFailed'; message: string }
  | { _tag: 'QPayResponseInvalid'; message: string }

export type QPayInvoice = {
  invoiceId: string
  qrText: string
  qrImage: string
  urls: { name: string; link: string }[]
}

const invalidResponse = Symbol('invalid QPay response')

const error = (tag: QPayError['_tag']): QPayError => ({
  _tag: tag,
  message: 'QPay төлбөрийг одоогоор бэлтгэх боломжгүй байна.',
})

let tokenClient: KyInstance | undefined
let authenticatedClient: KyInstance | undefined

const getTokenClient = () =>
  (tokenClient ??= ky.create({
    prefix: env.QPAY_BASE_URL || 'https://merchant.qpay.mn',
    timeout: 10_000,
    totalTimeout: 20_000,
    retry: {
      limit: 1,
      methods: ['post'],
      statusCodes: [408, 429, 500, 502, 503, 504],
    },
  }))

const fetchAccessToken = async () => {
  const response = await getTokenClient()
    .post('v2/auth/token', {
      headers: {
        authorization: `Basic ${btoa(`${env.QPAY_USERNAME}:${env.QPAY_PASSWORD}`)}`,
      },
    })
    .json<unknown>()
  const token = parseQPayTokenResponse(response)
  if (!token) throw invalidResponse
  return { value: token.access_token, expiresInSeconds: token.expires_in }
}

const tokenCache = createQPayTokenCache(fetchAccessToken)

const getAuthenticatedClient = () =>
  (authenticatedClient ??= ky.create({
    prefix: env.QPAY_BASE_URL || 'https://merchant.qpay.mn',
    timeout: 10_000,
    totalTimeout: 20_000,
    retry: {
      limit: 1,
      methods: [],
      statusCodes: [],
    },
    hooks: {
      beforeRequest: [
        async ({ request }) => {
          request.headers.set('authorization', `Bearer ${await tokenCache.get()}`)
        },
      ],
      afterResponse: [
        async ({ request, response, retryCount }) => {
          if (response.status !== 401 || retryCount > 0) return response

          const usedToken = request.headers.get('authorization')?.replace(/^Bearer /, '')
          tokenCache.invalidate(usedToken)
          const refreshedToken = await tokenCache.get()
          const retryRequest = new Request(request, {
            headers: new Headers(request.headers),
          })
          retryRequest.headers.set('authorization', `Bearer ${refreshedToken}`)
          return ky.retry({ request: retryRequest, delay: 0, code: 'QPAY_AUTH_REFRESH' })
        },
      ],
    },
  }))

const adapterError = (cause: unknown) =>
  error(
    cause === invalidResponse || cause instanceof SyntaxError
      ? 'QPayResponseInvalid'
      : 'QPayRequestFailed',
  )

export const createQPayInvoice = async (input: {
  orderNumber: string
  amountMnt: number
  description: string
  paymentLookupId: string
}) => {
  try {
    const response = await getAuthenticatedClient()
      .post('v2/invoice', {
        json: {
          invoice_code: env.QPAY_INVOICE_CODE,
          sender_invoice_no: input.orderNumber,
          invoice_receiver_code: 'terminal',
          invoice_description: input.description,
          amount: input.amountMnt,
          callback_url: createQPayCallbackUrl(env.PUBLIC_APP_URL, input.paymentLookupId),
        },
      })
      .json<unknown>()
    const invoice = parseQPayInvoiceResponse(response)
    if (!invoice) throw invalidResponse
    return Result.ok<QPayInvoice, QPayError>({
      invoiceId: invoice.invoice_id,
      qrText: invoice.qr_text,
      qrImage: invoice.qr_image,
      urls: invoice.urls,
    })
  } catch (cause) {
    return Result.err<QPayInvoice, QPayError>(adapterError(cause))
  }
}

export const verifyQPayPayment = async (invoiceId: string) => {
  try {
    const response = await getAuthenticatedClient()
      .post('v2/payment/check', {
        json: qpayPaymentCheckBody(invoiceId),
      })
      .json<unknown>()
    const paymentCheck = parseQPayPaymentCheckResponse(response)
    if (!paymentCheck) throw invalidResponse
    const paid = paymentCheck.rows.find(row => row.payment_status === 'PAID')
    return Result.ok<{ paymentId: string; amountMnt: number } | null, QPayError>(
      paid ? { paymentId: paid.payment_id, amountMnt: paid.payment_amount } : null,
    )
  } catch (cause) {
    return Result.err<{ paymentId: string; amountMnt: number } | null, QPayError>(
      adapterError(cause),
    )
  }
}
