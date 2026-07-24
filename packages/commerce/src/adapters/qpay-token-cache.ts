type AccessToken = { value: string; expiresInSeconds: number }

type CachedToken = { value: string; refreshAt: number }

export const createQPayTokenCache = (
  refresh: () => Promise<AccessToken>,
  now = () => Date.now(),
  refreshSkewMs = 30_000,
) => {
  let cached: CachedToken | undefined
  let refreshInFlight: Promise<string> | undefined

  const get = async () => {
    if (cached && now() < cached.refreshAt) return cached.value
    if (refreshInFlight) return refreshInFlight

    refreshInFlight = refresh().then(token => {
      cached = {
        value: token.value,
        refreshAt: now() + Math.max(0, token.expiresInSeconds * 1_000 - refreshSkewMs),
      }
      return token.value
    })

    try {
      return await refreshInFlight
    } finally {
      refreshInFlight = undefined
    }
  }

  const invalidate = (token?: string) => {
    if (!token || cached?.value === token) cached = undefined
  }

  return { get, invalidate }
}
