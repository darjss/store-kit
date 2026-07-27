import { getRequestEvent, respond } from '@solidjs/web'

const noStoreHeaders = { 'cache-control': 'private, no-store' }

const logUnexpectedError = (operation: string, error: unknown) => {
  console.error(
    JSON.stringify({
      message: 'Unexpected ДУНД server-function failure.',
      operation,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { name: 'UnknownError', message: String(error) },
    }),
  )
}

export const throwUnexpectedServerError = (operation: string, error: unknown, message: string) => {
  logUnexpectedError(operation, error)
  throw respond(
    { ok: false as const, code: 'server_error', message },
    { status: 500, headers: noStoreHeaders },
  )
}

export const enforceRateLimit = async (operation: string, limiter: RateLimit) => {
  let outcome: RateLimitOutcome
  try {
    const request = getRequestEvent()?.request
    const client = request?.headers.get('cf-connecting-ip') ?? 'local-test-client'
    outcome = await limiter.limit({ key: client })
  } catch (error) {
    return throwUnexpectedServerError(operation, error, 'Хүсэлтийг одоогоор гүйцэтгэж чадсангүй.')
  }

  if (!outcome.success) {
    throw respond(
      {
        ok: false as const,
        code: 'rate_limit_exceeded',
        message: 'Хэт олон хүсэлт илгээлээ. Түр хүлээгээд дахин оролдоно уу.',
      },
      { status: 429, headers: noStoreHeaders },
    )
  }
}
