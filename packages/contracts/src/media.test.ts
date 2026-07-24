import { describe, expect, test } from 'vite-plus/test'

import { remoteMediaBaseUrl, remoteMediaUrl } from './media'

describe('remote catalog media URLs', () => {
  test('constructs an encoded URL from a custom-domain origin and R2 key', () => {
    expect(
      remoteMediaUrl(
        'https://plugged.storekitcdn.darjs.dev/',
        'catalog/products/Aster graphite/өнгөт #1.webp',
      ),
    ).toBe(
      'https://plugged.storekitcdn.darjs.dev/catalog/products/Aster%20graphite/%D3%A9%D0%BD%D0%B3%D3%A9%D1%82%20%231.webp',
    )
  })

  test.each([
    'http://plugged.storekitcdn.darjs.dev/',
    'https://localhost/',
    'https://127.0.0.1/',
    'https://example.r2.dev/',
    'https://account.r2.cloudflarestorage.com/',
    'https://plugged.storekitcdn.darjs.dev/media/',
    'https://plugged.storekitcdn.darjs.dev',
  ])('rejects a non-custom-domain media origin: %s', value => {
    expect(() => remoteMediaBaseUrl(value)).toThrow()
  })

  test.each([
    '',
    '/catalog/image.webp',
    'catalog//image.webp',
    'catalog/../image.webp',
    String.raw`catalog\image.webp`,
  ])('rejects an unsafe R2 media key: %s', value => {
    expect(() => remoteMediaUrl('https://plugged.storekitcdn.darjs.dev/', value)).toThrow()
  })
})
