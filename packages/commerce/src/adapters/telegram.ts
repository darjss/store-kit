import { Result } from 'better-result'
import { env } from 'cloudflare:workers'
import ky from 'ky'

export type TelegramError = { _tag: 'TelegramUnavailable'; message: string }
const error = (): TelegramError => ({
  _tag: 'TelegramUnavailable',
  message: 'Ажилтанд мэдэгдэл илгээж чадсангүй.',
})

const call = async <Value>(method: string, json: object, read: (value: unknown) => Value) => {
  try {
    const response: unknown = await ky
      .post(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, { json })
      .json()
    if (!response || typeof response !== 'object' || !('ok' in response) || response.ok !== true)
      throw new Error('Invalid provider response.')
    return Result.ok<Value, TelegramError>(read(response))
  } catch {
    return Result.err<Value, TelegramError>(error())
  }
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
    value => {
      if (!value || typeof value !== 'object') throw new Error('Invalid provider response.')
      if (!('result' in value) || !value.result || typeof value.result !== 'object')
        throw new Error('Invalid provider response.')
      if (!('message_id' in value.result) || typeof value.result.message_id !== 'number')
        throw new Error('Invalid provider response.')
      return { messageId: String(value.result.message_id) }
    },
  )

export const sendPaidOrderMessage = (orderNumber: string, amountMnt: number) =>
  call(
    'sendMessage',
    {
      chat_id: env.TELEGRAM_CHAT_ID,
      text: `✅ Төлбөр төлөгдлөө\n${orderNumber} · ${amountMnt.toLocaleString('mn-MN')}₮`,
    },
    () => undefined,
  )

export const answerTelegramCallback = (callbackQueryId: string, text: string) =>
  call('answerCallbackQuery', { callback_query_id: callbackQueryId, text }, () => undefined)

export const editTelegramMessage = (messageId: string, text: string) =>
  call(
    'editMessageText',
    {
      chat_id: env.TELEGRAM_CHAT_ID,
      message_id: Number(messageId),
      text,
    },
    () => undefined,
  )
