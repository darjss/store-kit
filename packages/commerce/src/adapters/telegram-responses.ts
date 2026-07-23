import { Type } from 'typebox'
import { Value } from 'typebox/value'

export type ParsedTelegramResponse<Value> =
  | { status: 'ok'; value: Value }
  | { status: 'rejected' }
  | { status: 'invalid' }

const telegramRejectedResponseSchema = Type.Object(
  {
    ok: Type.Literal(false),
    error_code: Type.Number(),
    description: Type.String(),
  },
  { additionalProperties: true },
)

const telegramMessageResponseSchema = Type.Object(
  {
    ok: Type.Literal(true),
    result: Type.Object({ message_id: Type.Number() }, { additionalProperties: true }),
  },
  { additionalProperties: true },
)

const telegramActionResponseSchema = Type.Object(
  {
    ok: Type.Literal(true),
    result: Type.Union([Type.Boolean(), Type.Object({}, { additionalProperties: true })]),
  },
  { additionalProperties: true },
)

export const parseTelegramMessageResponse = (
  value: unknown,
): ParsedTelegramResponse<{ messageId: string }> => {
  if (Value.Check(telegramMessageResponseSchema, value)) {
    return {
      status: 'ok' as const,
      value: { messageId: String(value.result.message_id) },
    }
  }
  if (Value.Check(telegramRejectedResponseSchema, value)) return { status: 'rejected' as const }
  return { status: 'invalid' as const }
}

export const parseTelegramActionResponse = (value: unknown): ParsedTelegramResponse<undefined> => {
  if (Value.Check(telegramActionResponseSchema, value)) {
    return { status: 'ok' as const, value: undefined }
  }
  if (Value.Check(telegramRejectedResponseSchema, value)) return { status: 'rejected' as const }
  return { status: 'invalid' as const }
}
