import { Type } from 'typebox'
import type { Static } from 'typebox'
import { Value } from 'typebox/value'

type AccessToken = { value: string; expiresInSeconds: number }

const cachedTokenSchema = Type.Object(
  {
    value: Type.String({ minLength: 1 }),
    expiresAt: Type.Number({ minimum: 0 }),
  },
  { additionalProperties: false },
)

type CachedToken = Static<typeof cachedTokenSchema>

export const qpayAccessTokenCacheKey = 'providers:qpay:access-token:v1'

const minimumKvExpirationTtl = 60

export const createQPayTokenCache = (
  refresh: () => Promise<AccessToken>,
  cache: KVNamespace,
  now = () => Date.now(),
  refreshSkewMs = 30_000,
) => {
  let cached: CachedToken | undefined
  let rejectedToken: string | undefined
  let refreshInFlight: Promise<string> | undefined

  const isUsable = (token: CachedToken) => token.value !== rejectedToken && now() < token.expiresAt

  const readSharedToken = async () => {
    try {
      const value: unknown = await cache.get(qpayAccessTokenCacheKey, 'json')
      return Value.Check(cachedTokenSchema, value)
        ? Value.Parse(cachedTokenSchema, value)
        : undefined
    } catch {
      return undefined
    }
  }

  const writeSharedToken = async (token: CachedToken, refreshedAt: number) => {
    if (token.expiresAt <= refreshedAt) return

    const expirationTtl = Math.max(
      minimumKvExpirationTtl,
      Math.ceil((token.expiresAt - refreshedAt) / 1_000),
    )
    try {
      await cache.put(qpayAccessTokenCacheKey, JSON.stringify(token), { expirationTtl })
    } catch {
      // A cache failure must not block provider authentication.
    }
  }

  const load = async () => {
    const shared = await readSharedToken()
    if (shared && isUsable(shared)) {
      cached = shared
      return shared.value
    }

    const token = await refresh()
    const refreshedAt = now()
    cached = {
      value: token.value,
      expiresAt: refreshedAt + Math.max(0, token.expiresInSeconds * 1_000 - refreshSkewMs),
    }
    if (rejectedToken !== token.value) rejectedToken = undefined
    await writeSharedToken(cached, refreshedAt)
    return cached.value
  }

  const get = async () => {
    if (cached && isUsable(cached)) return cached.value
    if (refreshInFlight) return refreshInFlight

    refreshInFlight = load()
    try {
      return await refreshInFlight
    } finally {
      refreshInFlight = undefined
    }
  }

  const invalidate = (token?: string) => {
    if (!token) {
      cached = undefined
      return
    }

    rejectedToken = token
    if (cached?.value === token) cached = undefined
  }

  return { get, invalidate }
}
