type AccessToken = { value: string; expiresInSeconds: number }
type CachedToken = { value: string; expiresAt: number }

export const createQPayTokenCache = (
  refresh: () => Promise<AccessToken>,
  now = () => Date.now(),
  refreshSkewMs = 30_000,
) => {
  let cached: CachedToken | undefined
  let rejectedToken: string | undefined
  let refreshInFlight: Promise<string> | undefined

  const isUsable = (token: CachedToken) => token.value !== rejectedToken && now() < token.expiresAt

  const load = async () => {
    const token = await refresh()
    const refreshedAt = now()
    cached = {
      value: token.value,
      expiresAt: refreshedAt + Math.max(0, token.expiresInSeconds * 1_000 - refreshSkewMs),
    }
    if (rejectedToken !== token.value) rejectedToken = undefined
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
