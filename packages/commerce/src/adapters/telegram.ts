import { Result } from 'better-result'
import { env } from 'cloudflare:workers'
import { match } from 'dismatch'
import ky from 'ky'

import { telegramRequestError, telegramResponseError } from '~/errors/telegram'
import type { TelegramError } from '~/errors/telegram'

import { parseTelegramActionResponse, parseTelegramMessageResponse } from './telegram-responses'
import type { ParsedTelegramResponse } from './telegram-responses'

const telegramClient = ky.create({
  prefix: `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`,
  timeout: 10_000,
  retry: { limit: 1, methods: ['get', 'post'] },
  hooks: {
    beforeError: [() => new Error('Telegram request failed.')],
  },
})

const responseToResult = <Value>(response: ParsedTelegramResponse<Value>) =>
  match(
    response,
    'status',
  )<Result<Value, TelegramError>>({
    ok: ({ value }) => Result.ok<Value, TelegramError>(value),
    rejected: () => Result.err<Value, TelegramError>(telegramRequestError()),
    invalid: () => Result.err<Value, TelegramError>(telegramResponseError()),
  })

export const sendBankClaimMessage = async (input: {
  orderId: string
  orderNumber: string
  customerName: string
  customerPhone: string
  amountMnt: number
}) => {
  const response = await Result.tryPromise({
    try: () =>
      telegramClient
        .post('sendMessage', {
          json: {
            chat_id: env.TELEGRAM_CHAT_ID,
            text: `🏦 Шилжүүлэг шалгана уу\n${input.orderNumber} · ${input.amountMnt.toLocaleString('mn-MN')}₮\n${input.customerName} · ${input.customerPhone}`,
            reply_markup: {
              inline_keyboard: [
                [
                  { text: 'Төлбөрийг батлах', callback_data: `bank:confirm:${input.orderId}` },
                  { text: 'Татгалзах', callback_data: `bank:reject:${input.orderId}` },
                ],
              ],
            },
          },
        })
        .json<unknown>(),
    catch: telegramRequestError,
  })

  return response.map(parseTelegramMessageResponse).andThen(responseToResult)
}

export const sendPaidOrderMessage = async (orderNumber: string, amountMnt: number) => {
  const response = await Result.tryPromise({
    try: () =>
      telegramClient
        .post('sendMessage', {
          json: {
            chat_id: env.TELEGRAM_CHAT_ID,
            text: `✅ Төлбөр төлөгдлөө\n${orderNumber} · ${amountMnt.toLocaleString('mn-MN')}₮`,
          },
        })
        .json<unknown>(),
    catch: telegramRequestError,
  })

  return response.map(parseTelegramMessageResponse).andThen(responseToResult)
}

export const answerTelegramCallback = async (callbackQueryId: string, text: string) => {
  const response = await Result.tryPromise({
    try: () =>
      telegramClient
        .post('answerCallbackQuery', {
          json: { callback_query_id: callbackQueryId, text },
        })
        .json<unknown>(),
    catch: telegramRequestError,
  })

  return response.map(parseTelegramActionResponse).andThen(responseToResult)
}

export const editTelegramMessage = async (messageId: string, text: string) => {
  const response = await Result.tryPromise({
    try: () =>
      telegramClient
        .post('editMessageText', {
          json: {
            chat_id: env.TELEGRAM_CHAT_ID,
            message_id: Number(messageId),
            text,
          },
        })
        .json<unknown>(),
    catch: telegramRequestError,
  })

  return response.map(parseTelegramActionResponse).andThen(responseToResult)
}
