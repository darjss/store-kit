import { remoteMediaBaseUrl } from '@store-kit/contracts/media'
import { toStandardSchema } from '@store-kit/contracts/standard-schema'
import { createEnv } from '@t3-oss/env-core'
import { Type } from 'typebox'

export const productionMediaBaseUrl = 'https://plugged.storekitcdn.darjs.dev/'

const url = toStandardSchema(Type.String({ format: 'uri' }))
const deploymentEnvironment = toStandardSchema(
  Type.Union([Type.Literal('development'), Type.Literal('production')]),
)
const optionalSecret = toStandardSchema(
  Type.Union([Type.String({ minLength: 1 }), Type.Undefined()]),
)
const optionalTelegramChatId = toStandardSchema(
  Type.Union([Type.String({ pattern: '^-?\\d+$' }), Type.Undefined()]),
)
const optionalTelegramUserId = toStandardSchema(
  Type.Union([Type.String({ pattern: '^\\d+$' }), Type.Undefined()]),
)

const qpayCredentialNames = ['QPAY_USERNAME', 'QPAY_PASSWORD', 'QPAY_INVOICE_CODE'] as const
const telegramCredentialNames = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'TELEGRAM_WEBHOOK_SECRET',
  'TELEGRAM_ADMIN_USER_ID',
] as const

export type PluggedRuntimeEnvironment = {
  DEPLOYMENT_ENV?: string
  PUBLIC_APP_URL?: string
  PUBLIC_MEDIA_BASE_URL?: string
  QPAY_BASE_URL?: string
  QPAY_USERNAME?: string
  QPAY_PASSWORD?: string
  QPAY_INVOICE_CODE?: string
  TELEGRAM_BOT_TOKEN?: string
  TELEGRAM_CHAT_ID?: string
  TELEGRAM_WEBHOOK_SECRET?: string
  TELEGRAM_ADMIN_USER_ID?: string
}

const assertCompleteGroup = <Key extends string>(
  environment: Partial<Record<Key, unknown>>,
  provider: string,
  keys: readonly Key[],
) => {
  const missing = keys.filter(key => environment[key] === undefined)
  if (missing.length === 0 || missing.length === keys.length) return

  throw new Error(
    `${provider} credentials must be all set or all empty. Missing: ${missing.join(', ')}.`,
  )
}

const issuePath = (path: readonly (PropertyKey | { key: PropertyKey })[] | undefined) =>
  path
    ?.map(segment => (typeof segment === 'object' ? segment.key : segment))
    .map(String)
    .join('.') || 'environment'

export const validatePluggedEnvironment = (
  runtimeEnv: PluggedRuntimeEnvironment,
  options: { localDevelopment?: boolean } = {},
) => {
  const environment = createEnv({
    server: {
      DEPLOYMENT_ENV: deploymentEnvironment,
      QPAY_BASE_URL: url,
      QPAY_USERNAME: optionalSecret,
      QPAY_PASSWORD: optionalSecret,
      QPAY_INVOICE_CODE: optionalSecret,
      TELEGRAM_BOT_TOKEN: optionalSecret,
      TELEGRAM_CHAT_ID: optionalTelegramChatId,
      TELEGRAM_WEBHOOK_SECRET: optionalSecret,
      TELEGRAM_ADMIN_USER_ID: optionalTelegramUserId,
    },
    clientPrefix: 'PUBLIC_',
    client: {
      PUBLIC_APP_URL: url,
      PUBLIC_MEDIA_BASE_URL: url,
    },
    runtimeEnv,
    emptyStringAsUndefined: true,
    isServer: true,
    onValidationError: issues => {
      const details = issues.map(issue => `${issuePath(issue.path)}: ${issue.message}`).join('; ')
      throw new Error(`Invalid Plugged environment. ${details}`)
    },
  })

  assertCompleteGroup(environment, 'QPay', qpayCredentialNames)
  assertCompleteGroup(environment, 'Telegram', telegramCredentialNames)

  const mediaBaseUrl = remoteMediaBaseUrl(environment.PUBLIC_MEDIA_BASE_URL)
  if (environment.DEPLOYMENT_ENV === 'production' && mediaBaseUrl !== productionMediaBaseUrl) {
    throw new Error(`Production media must use ${productionMediaBaseUrl}`)
  }
  if (environment.DEPLOYMENT_ENV === 'development' && mediaBaseUrl === productionMediaBaseUrl) {
    throw new Error('Development media must not fall back to the production R2 custom domain.')
  }
  if (options.localDevelopment && environment.DEPLOYMENT_ENV !== 'development') {
    throw new Error('Local development requires DEPLOYMENT_ENV=development.')
  }

  return environment
}
