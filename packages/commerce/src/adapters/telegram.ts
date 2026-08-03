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

export type OrderNotification = {
  orderNumber: string
  customerName: string
  customerPhone: string
  amountMnt: number
  lines: { productName: string; variantName: string; quantity: number }[]
  district: string
  khoroo: string
  address: string
  deliveryNotes: string | null
}

const escapeHtml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const orderDetails = (input: OrderNotification) => {
  const lines = input.lines
    .map(
      line =>
        `• ${escapeHtml(line.productName)} · ${escapeHtml(line.variantName)} × ${line.quantity}`,
    )
    .join('\n')
  const delivery = [input.district, input.khoroo, input.address].map(escapeHtml).join(', ')
  const notes = input.deliveryNotes ? `\n<b>Тэмдэглэл:</b> ${escapeHtml(input.deliveryNotes)}` : ''

  return `<b>Захиалга:</b> ${escapeHtml(input.orderNumber)}\n<b>Дүн:</b> ${input.amountMnt.toLocaleString('mn-MN')}₮\n<b>Харилцагч:</b> ${escapeHtml(input.customerName)} · ${escapeHtml(input.customerPhone)}\n<b>Бараа:</b>\n${lines}\n<b>Хүргэлт:</b> ${delivery}${notes}`
}

export const sendBankClaimMessage = async (input: OrderNotification & { orderId: string }) => {
  const response = await Result.tryPromise({
    try: () =>
      telegramClient
        .post('sendMessage', {
          json: {
            chat_id: env.TELEGRAM_CHAT_ID,
            parse_mode: 'HTML',
            text: `<b>🏦 Шилжүүлэг шалгана уу</b>\n${orderDetails(input)}`,
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

export const sendPaidOrderMessage = async (input: OrderNotification) => {
  const response = await Result.tryPromise({
    try: () =>
      telegramClient
        .post('sendMessage', {
          json: {
            chat_id: env.TELEGRAM_CHAT_ID,
            parse_mode: 'HTML',
            text: `<b>✅ Төлбөр төлөгдлөө</b>\n${orderDetails(input)}`,
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
