import { describe, expect, it } from 'vite-plus/test'

import { parseTelegramActionResponse, parseTelegramMessageResponse } from './telegram-responses'

describe('Telegram response validation', () => {
  it('accepts documented successful responses', () => {
    expect(
      parseTelegramMessageResponse({
        ok: true,
        result: {
          message_id: 123,
          date: 1_718_000_000,
          chat: { id: -100123, type: 'supergroup' },
          text: 'Order received',
        },
      }),
    ).toEqual({ status: 'ok', value: { messageId: '123' } })
    expect(parseTelegramActionResponse({ ok: true, result: true })).toEqual({
      status: 'ok',
      value: undefined,
    })
  })

  it('distinguishes rejected and invalid responses', () => {
    expect(
      parseTelegramMessageResponse({
        ok: false,
        error_code: 400,
        description: 'Bad Request: chat not found',
      }),
    ).toEqual({ status: 'rejected' })
    expect(parseTelegramMessageResponse({ ok: true, result: { message_id: '123' } })).toEqual({
      status: 'invalid',
    })
    expect(parseTelegramActionResponse({ ok: true })).toEqual({ status: 'invalid' })
  })
})
