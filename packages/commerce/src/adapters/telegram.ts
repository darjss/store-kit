import { Result } from 'better-result'
import { env } from 'cloudflare:workers'
import ky from 'ky'

import { parseTelegramActionResponse, parseTelegramMessageResponse } from './telegram-responses'
import type { ParsedTelegramResponse } from './telegram-responses'

export type TelegramError =
  | { _tag: 'TelegramRequestFailed'; message: string }
  | { _tag: 'TelegramResponseInvalid'; message: string }

const requestError = (): TelegramError => ({
  _tag: 'TelegramRequestFailed',
  message: 'Ажилтанд мэдэгдэл илгээж чадсангүй.',
})

const responseError = (): TelegramError => ({
  _tag: 'TelegramResponseInvalid',
  message: 'Ажилтанд мэдэгдэл илгээж чадсангүй.',
})

let client: ReturnType<typeof ky.create> | undefined

const getClient = () => {
  client ??= ky.create({
    prefix: `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`,
    timeout: 10_000,
    retry: { limit: 1, methods: ['get', 'post'] },
    hooks: {
      beforeError: [() => new Error('Telegram request failed.')],
    },
  })
  return client
}

const call = async <Value>(
  method: string,
  json: object,
  parse: (value: unknown) => ParsedTelegramResponse<Value>,
) => {
  let response: unknown
  try {
    response = await getClient().post(method, { json }).json()
  } catch {
    return Result.err<Value, TelegramError>(requestError())
  }

  const parsed = parse(response)
  if (parsed.status === 'invalid') return Result.err<Value, TelegramError>(responseError())
  if (parsed.status === 'rejected') return Result.err<Value, TelegramError>(requestError())
  return Result.ok<Value, TelegramError>(parsed.value)
}

export const sendBankClaimMessage = (input: {
  orderId: string
  orderNumber: string
  customerName: string
  customerPhone: string
  amountMnt: number
}) =>
  call(
    'sendMessage',
    {
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
    parseTelegramMessageResponse,
  )

export const sendPaidOrderMessage = (orderNumber: string, amountMnt: number) =>
  call(
    'sendMessage',
    {
      chat_id: env.TELEGRAM_CHAT_ID,
      text: `✅ Төлбөр төлөгдлөө\n${orderNumber} · ${amountMnt.toLocaleString('mn-MN')}₮`,
    },
    parseTelegramMessageResponse,
  )

export const answerTelegramCallback = (callbackQueryId: string, text: string) =>
  call(
    'answerCallbackQuery',
    { callback_query_id: callbackQueryId, text },
    parseTelegramActionResponse,
  )

export const editTelegramMessage = (messageId: string, text: string) =>
  call(
    'editMessageText',
    {
      chat_id: env.TELEGRAM_CHAT_ID,
      message_id: Number(messageId),
      text,
    },
    parseTelegramActionResponse,
  )
