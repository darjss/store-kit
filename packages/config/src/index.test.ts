import { expect, test } from 'vite-plus/test'

import { parseStoreConfig } from './index'

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
