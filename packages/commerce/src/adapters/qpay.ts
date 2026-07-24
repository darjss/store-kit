import { Result } from 'better-result'
import { env } from 'cloudflare:workers'
import ky from 'ky'
import type { KyInstance } from 'ky'

import { qpayError } from '~/errors/qpay'

import { createQPayCallbackUrl, qpayPaymentCheckBody } from './qpay-callback'
import {
  parseQPayInvoiceResponse,
  parseQPayPaymentCheckResponse,
  parseQPayTokenResponse,
} from './qpay-responses'
import { createQPayTokenCache } from './qpay-token-cache'

export { createQPayCallbackUrl, qpayPaymentCheckBody } from './qpay-callback'

export type QPayInvoice = {
  invoiceId: string
  qrText: string
  qrImage: string
  urls: { name: string; link: string }[]
}

const invalidResponse = Symbol('invalid QPay response')
const isTokenRequest = (request: Request) =>
  new URL(request.url).pathname.endsWith('/v2/auth/token')

let qpayClient: KyInstance

const fetchAccessToken = async () => {
  const response = await qpayClient.post('v2/auth/token').json<unknown>()
  const token = parseQPayTokenResponse(response)
  if (!token) throw invalidResponse
  return { value: token.access_token, expiresInSeconds: token.expires_in }
}

const tokenCache = createQPayTokenCache(fetchAccessToken, env.CACHE)

qpayClient = ky.create({
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
        if (isTokenRequest(request)) {
          request.headers.set(
            'authorization',
            `Basic ${btoa(`${env.QPAY_USERNAME}:${env.QPAY_PASSWORD}`)}`,
          )
          return
        }

        request.headers.set('authorization', `Bearer ${await tokenCache.get()}`)
      },
    ],
    afterResponse: [
      async ({ request, response, retryCount }) => {
        if (isTokenRequest(request) || response.status !== 401 || retryCount > 0) return response

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
})

const adapterError = (cause: unknown) =>
  qpayError(
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
  const response = await Result.tryPromise({
    try: () =>
      qpayClient
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
        .json<unknown>(),
    catch: adapterError,
  })

  return response
    .andThen(value => {
      const invoice = parseQPayInvoiceResponse(value)
      return invoice ? Result.ok(invoice) : Result.err(qpayError('QPayResponseInvalid'))
    })
    .map(invoice => ({
      invoiceId: invoice.invoice_id,
      qrText: invoice.qr_text,
      qrImage: invoice.qr_image,
      urls: invoice.urls.map(({ name, link }) => ({ name, link })),
    }))
}

export const verifyQPayPayment = async (invoiceId: string) => {
  const response = await Result.tryPromise({
    try: () =>
      qpayClient
        .post('v2/payment/check', {
          json: qpayPaymentCheckBody(invoiceId),
        })
        .json<unknown>(),
    catch: adapterError,
  })

  return response
    .andThen(value => {
      const paymentCheck = parseQPayPaymentCheckResponse(value)
      return paymentCheck ? Result.ok(paymentCheck) : Result.err(qpayError('QPayResponseInvalid'))
    })
    .map(paymentCheck => {
      const paid = paymentCheck.rows.find(row => row.payment_status === 'PAID')
      return paid ? { paymentId: paid.payment_id, amountMnt: paid.payment_amount } : null
    })
}
