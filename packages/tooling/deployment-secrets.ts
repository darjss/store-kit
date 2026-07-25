import { readFile, stat } from 'node:fs/promises'
import { isAbsolute } from 'node:path'
import { parseEnv } from 'node:util'

const qpaySecretNames = ['QPAY_USERNAME', 'QPAY_PASSWORD', 'QPAY_INVOICE_CODE'] as const
const telegramSecretNames = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'TELEGRAM_WEBHOOK_SECRET',
  'TELEGRAM_ADMIN_USER_ID',
] as const
const allowedSecretNames = new Set<string>([...qpaySecretNames, ...telegramSecretNames])

export const validateDevelopmentSecretsFile = async (pathValue: string | undefined) => {
  const path = pathValue?.trim()
  if (!path || !isAbsolute(path)) {
    throw new Error('PLUGGED_SECRETS_FILE must be an absolute owner-only file.')
  }

  const file = await stat(path)
  if (!file.isFile() || (file.mode & 0o777) !== 0o600) {
    throw new Error('PLUGGED_SECRETS_FILE must be a regular file with mode 600.')
  }

  const secrets = parseEnv(await readFile(path, 'utf8'))
  const names = Object.keys(secrets)
  const unknown = names.filter(name => !allowedSecretNames.has(name))
  if (unknown.length > 0) {
    throw new Error('PLUGGED_SECRETS_FILE contains an unsupported secret name.')
  }
  if (qpaySecretNames.some(name => !secrets[name]?.trim())) {
    throw new Error('PLUGGED_SECRETS_FILE must contain every non-empty QPay secret.')
  }
  if (secrets.QPAY_INVOICE_CODE !== 'AMERIK_VITAMIN_INVOICE') {
    throw new Error('PLUGGED_SECRETS_FILE has the wrong QPay invoice code.')
  }

  const telegramCount = telegramSecretNames.filter(name => secrets[name]?.trim()).length
  if (telegramCount !== 0 && telegramCount !== telegramSecretNames.length) {
    throw new Error('PLUGGED_SECRETS_FILE must configure all Telegram secrets or none of them.')
  }

  return path
}
