import { describe, expect, it } from 'vite-plus/test'

import { createQPayTokenCache } from './qpay-token-cache'

describe.sequential('QPay token cache', () => {
  it('keeps bearer tokens inside one isolate cache', async () => {
    let now = 1_000
    let refreshCount = 0
    const refresh = async () => ({
      value: `access-token-${++refreshCount}`,
      expiresInSeconds: 120,
    })
    const firstIsolate = createQPayTokenCache(refresh, () => now)

    expect(await firstIsolate.get()).toBe('access-token-1')
    expect(await firstIsolate.get()).toBe('access-token-1')

    const secondIsolate = createQPayTokenCache(refresh, () => now)
    expect(await secondIsolate.get()).toBe('access-token-2')

    now = 90_999
    expect(await firstIsolate.get()).toBe('access-token-1')
    expect(refreshCount).toBe(2)
  })

  it('deduplicates refresh and bypasses a rejected token', async () => {
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
    })

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
