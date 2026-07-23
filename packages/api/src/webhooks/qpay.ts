import { commerce } from '@store-kit/commerce'
import { Elysia, t } from 'elysia'

export const qpayWebhook = new Elysia({ aot: false, prefix: '/api/webhooks' }).post(
  '/qpay',
  async ({ query, set }) => {
    set.headers['cache-control'] = 'no-store'
    const outcome = await commerce.payments.handleQPayCallback(query.payment_id)
    if (outcome.status === 'retryable-failure') {
      set.status = 503
      return { ok: false }
    }
    return { ok: true }
  },
  { query: t.Object({ payment_id: t.String({ minLength: 1 }) }) },
)
