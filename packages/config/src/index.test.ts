import { describe, expect, test } from 'vite-plus/test'

import { parseBetterAuthSecrets, parseStoreConfig } from './index'

const config = {
  id: 'plugged',
  name: 'Plugged',
  publicBaseUrl: 'https://example.com',
}

test('store config accepts an absolute URL', () => {
  expect(parseStoreConfig(config)).toEqual(config)
})

test('store config rejects invalid URLs and strips unknown keys', () => {
  expect(() => parseStoreConfig({ ...config, publicBaseUrl: '/shop' })).toThrow()
  expect(parseStoreConfig({ ...config, extra: true })).toEqual(config)
})

describe('Better Auth secrets', () => {
  test('parses trimmed versioned secrets', () => {
    expect(
      parseBetterAuthSecrets(
        ' 2:current-auth-secret-at-least-thirty-two-characters, 1:previous-auth-secret-at-least-thirty-two-characters ',
      ),
    ).toEqual([
      { version: 2, value: 'current-auth-secret-at-least-thirty-two-characters' },
      { version: 1, value: 'previous-auth-secret-at-least-thirty-two-characters' },
    ])
  })

  test.each(['secret-without-version', 'x:long-enough-auth-secret-at-least-thirty-two', '1:short'])(
    'rejects invalid entry %s',
    input => expect(() => parseBetterAuthSecrets(input)).toThrow('BETTER_AUTH_SECRETS'),
  )
})
