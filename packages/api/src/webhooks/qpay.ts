import { commerce } from '@store-kit/commerce'
import { Elysia, t } from 'elysia'

export const qpayWebhook = new Elysia({ aot: false, prefix: '/api/webhooks' }).post(
  '/qpay',
  async ({ body, set }) => {
    set.headers['cache-control'] = 'no-store'
    await commerce.payments.handleQPayCallback(body.payment_id)
    return { ok: true }
  },
  { body: t.Object({ payment_id: t.String() }) },
)
