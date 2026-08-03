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

test('store config rejects invalid URLs and unknown keys', () => {
  expect(() => parseStoreConfig({ ...config, publicBaseUrl: '/shop' })).toThrow()
  expect(() => parseStoreConfig({ ...config, extra: true })).toThrow(/extra/)
})

test('store config accepts a full branding contract', () => {
  const full = {
    ...config,
    brand: { wordmark: 'ӨНГӨ', logoAsset: '/brand/logo.webp' },
    theme: { accent: '#2b3cff', ink: '#14120e', surface: '#f6f5f2', radius: 'md' },
    contact: { phone: '+976 8811 2233', instagram: 'https://instagram.com/ongo' },
    footer: { tagline: 'Улаанбаатарын өдөр тутмын дэлгүүр.' },
  }
  expect(parseStoreConfig(full)).toEqual(full)
})

test('store config rejects invalid theme values with paths', () => {
  expect(() =>
    parseStoreConfig({
      ...config,
      theme: { accent: 'blue', ink: '#14120e', surface: '#f6f5f2', radius: 'md' },
    }),
  ).toThrow(/theme\/accent/)
  expect(() =>
    parseStoreConfig({
      ...config,
      theme: { accent: '#2b3cff', ink: '#14120e', surface: '#f6f5f2', radius: 'xl' },
    }),
  ).toThrow(/theme\/radius/)
})

test('store config rejects unknown keys inside groups', () => {
  expect(() =>
    parseStoreConfig({ ...config, contact: { phone: '+97688112233', twitter: 'https://x.com/a' } }),
  ).toThrow(/twitter/)
})

test('store config rejects non-https social links and bad ids', () => {
  expect(() =>
    parseStoreConfig({ ...config, contact: { instagram: 'http://instagram.com/a' } }),
  ).toThrow()
  expect(() => parseStoreConfig({ ...config, id: 'Plugged' })).toThrow(/id/)
})
