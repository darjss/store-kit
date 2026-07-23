import { expect, test } from 'vite-plus/test'

import { createQPayTokenCache } from './qpay-token-cache'

test('reuses an isolate token until its skewed refresh time', async () => {
  let now = 1_000
  let refreshCount = 0
  const cache = createQPayTokenCache(
    async () => ({ value: `token-${++refreshCount}`, expiresInSeconds: 60 }),
    () => now,
    10_000,
  )

  expect(await cache.get()).toBe('token-1')
  now += 49_999
  expect(await cache.get()).toBe('token-1')
  now += 1
  expect(await cache.get()).toBe('token-2')
})

test('deduplicates concurrent refresh and invalidates only the rejected token', async () => {
  let resolveRefresh: ((token: { value: string; expiresInSeconds: number }) => void) | undefined
  let refreshCount = 0
  const cache = createQPayTokenCache(() => {
    refreshCount += 1
    return new Promise(resolve => {
      resolveRefresh = resolve
    })
  })

  const first = cache.get()
  const second = cache.get()
  expect(refreshCount).toBe(1)
  resolveRefresh?.({ value: 'token-1', expiresInSeconds: 60 })
  await expect(Promise.all([first, second])).resolves.toEqual(['token-1', 'token-1'])

  cache.invalidate('another-token')
  expect(await cache.get()).toBe('token-1')
  cache.invalidate('token-1')

  const refreshed = cache.get()
  expect(refreshCount).toBe(2)
  resolveRefresh?.({ value: 'token-2', expiresInSeconds: 60 })
  await expect(refreshed).resolves.toBe('token-2')
})
