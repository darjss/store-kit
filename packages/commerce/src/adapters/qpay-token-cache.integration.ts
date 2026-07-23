import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vite-plus/test'

import { createQPayTokenCache, qpayAccessTokenCacheKey } from './qpay-token-cache'

describe.sequential('QPay token cache', () => {
  beforeEach(async () => {
    await env.CACHE.delete(qpayAccessTokenCacheKey)
  })

  it('shares only the skewed token and expiry through KV', async () => {
    let now = 1_000
    let refreshCount = 0
    const refresh = async () => ({
      value: `access-token-${++refreshCount}`,
      expiresInSeconds: 120,
    })
    const firstIsolate = createQPayTokenCache(refresh, env.CACHE, () => now)

    expect(await firstIsolate.get()).toBe('access-token-1')
    const stored: unknown = await env.CACHE.get(qpayAccessTokenCacheKey, 'json')
    expect(stored).toEqual({ value: 'access-token-1', expiresAt: 91_000 })

    const secondIsolate = createQPayTokenCache(refresh, env.CACHE, () => now)
    expect(await secondIsolate.get()).toBe('access-token-1')
    expect(refreshCount).toBe(1)

    now = 90_999
    expect(await firstIsolate.get()).toBe('access-token-1')
    expect(refreshCount).toBe(1)
  })

  it('deduplicates refresh and bypasses a rejected token that KV can still return', async () => {
    let resolveRefresh: ((token: { value: string; expiresInSeconds: number }) => void) | undefined
    let firstRefreshStarted: (() => void) | undefined
    let secondRefreshStarted: (() => void) | undefined
    const firstStart = new Promise<void>(resolve => {
      firstRefreshStarted = resolve
    })
    const secondStart = new Promise<void>(resolve => {
      secondRefreshStarted = resolve
    })
    let refreshCount = 0
    const cache = createQPayTokenCache(() => {
      refreshCount += 1
      if (refreshCount === 1) firstRefreshStarted?.()
      if (refreshCount === 2) secondRefreshStarted?.()
      return new Promise(resolve => {
        resolveRefresh = resolve
      })
    }, env.CACHE)

    const first = cache.get()
    const second = cache.get()
    await firstStart
    expect(refreshCount).toBe(1)
    resolveRefresh?.({ value: 'access-token-1', expiresInSeconds: 120 })
    await expect(Promise.all([first, second])).resolves.toEqual([
      'access-token-1',
      'access-token-1',
    ])

    cache.invalidate('access-token-1')
    const refreshed = cache.get()
    await secondStart
    expect(refreshCount).toBe(2)
    resolveRefresh?.({ value: 'access-token-2', expiresInSeconds: 120 })
    await expect(refreshed).resolves.toBe('access-token-2')
    expect(await cache.get()).toBe('access-token-2')
    expect(refreshCount).toBe(2)
  })
})
