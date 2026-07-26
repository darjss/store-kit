import { commerce } from '@store-kit/commerce'
import { orderIdPattern } from '@store-kit/contracts/orders'
import { env } from 'cloudflare:workers'
import { Elysia, t } from 'elysia'
import { Type } from 'typebox'
import { Value } from 'typebox/value'

const orderIdExpression = new RegExp(orderIdPattern)
const encoder = new TextEncoder()

const matchesSecret = async (provided: string | null | undefined, expected: string) => {
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided ?? '')),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ])
  const providedBytes = new Uint8Array(providedHash)
  const expectedBytes = new Uint8Array(expectedHash)
  let difference = 0
  for (let index = 0; index < providedBytes.length; index += 1) {
    difference |= providedBytes[index]! ^ expectedBytes[index]!
  }
  return difference === 0
}

const telegramUpdateSchema = Type.Object(
  {
    callback_query: Type.Optional(
      Type.Object(
        {
          id: Type.String(),
          from: Type.Object({ id: Type.Number() }, { additionalProperties: true }),
          data: Type.Optional(Type.String()),
          message: Type.Optional(
            Type.Object({ message_id: Type.Number() }, { additionalProperties: true }),
          ),
        },
        { additionalProperties: true },
      ),
    ),
  },
  { additionalProperties: true },
)

export const telegramWebhook = new Elysia({ aot: false, prefix: '/api/webhooks' }).post(
  '/telegram',
  async ({ body, headers, set }) => {
    set.headers['cache-control'] = 'no-store'
    if (
      !(await matchesSecret(
        headers['x-telegram-bot-api-secret-token'],
        env.TELEGRAM_WEBHOOK_SECRET,
      ))
    ) {
      set.status = 401
      return { ok: false }
    }
    if (!Value.Check(telegramUpdateSchema, body)) return { ok: true }

    const callback = body.callback_query
    if (!callback || String(callback.from.id) !== env.TELEGRAM_ADMIN_USER_ID) return { ok: true }
    if (!callback.message) return { ok: true }
    const match = /^bank:(confirm|reject):(.+)$/.exec(callback.data ?? '')
    const orderId = match?.[2]
    if (!match || !orderId || !orderIdExpression.test(orderId)) return { ok: true }
    const outcome = await commerce.payments.handleBankTransferCallback({
      action: match[1] === 'confirm' ? 'confirm' : 'reject',
      orderId,
      callbackQueryId: callback.id,
      telegramMessageId: String(callback.message.message_id),
    })
    if (outcome.status === 'retryable-failure') {
      set.status = 503
      return { ok: false }
    }
    return { ok: true }
  },
  {
    parse: async ({ request }) =>
      (await matchesSecret(
        request.headers.get('x-telegram-bot-api-secret-token'),
        env.TELEGRAM_WEBHOOK_SECRET,
      ))
        ? request.json().catch(() => undefined)
        : null,
    headers: t.Object(
      { 'x-telegram-bot-api-secret-token': t.Optional(t.String()) },
      { additionalProperties: true },
    ),
  },
)
