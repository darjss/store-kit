import { handleBankTransferCallback } from '@store-kit/commerce/checkout'
import { entityIdPrefixes, hasTypeIdPrefix } from '@store-kit/db/ids'
import { env } from 'cloudflare:workers'
import { Elysia, t } from 'elysia'

export const telegramWebhook = new Elysia({ aot: false, prefix: '/api/webhooks' }).post(
  '/telegram',
  async ({ body, headers, set }) => {
    set.headers['cache-control'] = 'no-store'
    if (headers['x-telegram-bot-api-secret-token'] !== env.TELEGRAM_WEBHOOK_SECRET) {
      set.status = 401
      return { ok: false }
    }
    const callback = body.callback_query
    if (!callback || String(callback.from.id) !== env.TELEGRAM_ADMIN_USER_ID) return { ok: true }
    const match = /^bank:(confirm|reject):(.+)$/.exec(callback.data ?? '')
    if (!match || !hasTypeIdPrefix(match[2]!, entityIdPrefixes.order)) return { ok: true }
    await handleBankTransferCallback({
      action: match[1] === 'confirm' ? 'confirm' : 'reject',
      orderId: match[2]!,
      callbackQueryId: callback.id,
    })
    return { ok: true }
  },
  {
    headers: t.Object(
      { 'x-telegram-bot-api-secret-token': t.Optional(t.String()) },
      { additionalProperties: true },
    ),
    body: t.Object({
      callback_query: t.Optional(
        t.Object({
          id: t.String(),
          from: t.Object({ id: t.Number() }),
          data: t.Optional(t.String()),
        }),
      ),
    }),
  },
)
