import { expect, expectTypeOf, test } from 'vite-plus/test'

import { validatePluggedEnvironment } from './environment'
import type { PluggedRuntimeEnvironment } from './environment'

const localEnvironment = {
  DEPLOYMENT_ENV: 'development',
  PUBLIC_APP_URL: 'https://plugged.localhost',
  PUBLIC_MEDIA_BASE_URL: 'https://plugged-development-media.example.com/',
  QPAY_BASE_URL: 'https://merchant-sandbox.qpay.mn',
  QPAY_USERNAME: '',
  QPAY_PASSWORD: '',
  QPAY_INVOICE_CODE: '',
  TELEGRAM_BOT_TOKEN: '',
  TELEGRAM_CHAT_ID: '',
  TELEGRAM_WEBHOOK_SECRET: '',
  TELEGRAM_ADMIN_USER_ID: '',
} satisfies PluggedRuntimeEnvironment

test('accepts local development without provider credentials', () => {
  const environment = validatePluggedEnvironment(localEnvironment, { localDevelopment: true })

  expect(environment.PUBLIC_APP_URL).toBe('https://plugged.localhost')
  expect(environment.QPAY_USERNAME).toBeUndefined()
  expect(environment.TELEGRAM_BOT_TOKEN).toBeUndefined()
  expectTypeOf(environment.PUBLIC_MEDIA_BASE_URL).toBeString()
  expectTypeOf(environment.QPAY_USERNAME).toEqualTypeOf<string | undefined>()
})

test('accepts complete provider credential groups', () => {
  const environment = validatePluggedEnvironment({
    ...localEnvironment,
    QPAY_USERNAME: 'merchant',
    QPAY_PASSWORD: 'secret',
    QPAY_INVOICE_CODE: 'invoice-code',
    TELEGRAM_BOT_TOKEN: 'bot-token',
    TELEGRAM_CHAT_ID: '-100123456',
    TELEGRAM_WEBHOOK_SECRET: 'webhook-secret',
    TELEGRAM_ADMIN_USER_ID: '123456',
  })

  expect(environment.QPAY_INVOICE_CODE).toBe('invoice-code')
  expect(environment.TELEGRAM_CHAT_ID).toBe('-100123456')
})

test('accepts only the required production media origin in production', () => {
  const environment = validatePluggedEnvironment({
    ...localEnvironment,
    DEPLOYMENT_ENV: 'production',
    PUBLIC_MEDIA_BASE_URL: 'https://plugged.storekitcdn.darjs.dev/',
  })

  expect(environment.DEPLOYMENT_ENV).toBe('production')
})

test('rejects production media fallback in development', () => {
  expect(() =>
    validatePluggedEnvironment({
      ...localEnvironment,
      PUBLIC_MEDIA_BASE_URL: 'https://plugged.storekitcdn.darjs.dev/',
    }),
  ).toThrow('Development media must not fall back')
})

test('rejects the production environment during local development', () => {
  expect(() =>
    validatePluggedEnvironment(
      {
        ...localEnvironment,
        DEPLOYMENT_ENV: 'production',
        PUBLIC_MEDIA_BASE_URL: 'https://plugged.storekitcdn.darjs.dev/',
      },
      { localDevelopment: true },
    ),
  ).toThrow('Local development requires DEPLOYMENT_ENV=development.')
})

test.each([
  ['PUBLIC_APP_URL', { PUBLIC_APP_URL: 'not a URL' }],
  ['QPAY_BASE_URL', { QPAY_BASE_URL: '/relative' }],
  ['TELEGRAM_CHAT_ID', { TELEGRAM_BOT_TOKEN: 'token', TELEGRAM_CHAT_ID: 'chat' }],
] as const)('rejects malformed %s values', (name, override) => {
  expect(() =>
    validatePluggedEnvironment({
      ...localEnvironment,
      ...override,
    }),
  ).toThrow(`${name}:`)
})

test.each([
  [
    'QPay',
    {
      QPAY_USERNAME: 'merchant',
      QPAY_PASSWORD: '',
      QPAY_INVOICE_CODE: '',
    },
  ],
  [
    'Telegram',
    {
      TELEGRAM_BOT_TOKEN: 'token',
      TELEGRAM_CHAT_ID: '-100123456',
      TELEGRAM_WEBHOOK_SECRET: '',
      TELEGRAM_ADMIN_USER_ID: '',
    },
  ],
] as const)('rejects a partial %s credential group', (provider, override) => {
  expect(() =>
    validatePluggedEnvironment({
      ...localEnvironment,
      ...override,
    }),
  ).toThrow(`${provider} credentials must be all set or all empty.`)
})
