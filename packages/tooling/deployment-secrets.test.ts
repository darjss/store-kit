import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, test } from 'vite-plus/test'

import { validateDevelopmentSecretsFile } from './deployment-secrets.ts'

const directories: string[] = []
const authSecrets = [
  'BETTER_AUTH_SECRET=auth-secret-at-least-thirty-two-characters',
  'GOOGLE_CLIENT_ID=google-client-id',
  'GOOGLE_CLIENT_SECRET=google-client-secret',
]
const writeSecrets = async (source: string, mode = 0o600) => {
  const directory = await mkdtemp(join(tmpdir(), 'plugged-deployment-secrets-'))
  directories.push(directory)
  const path = join(directory, 'secrets.env')
  await writeFile(path, source, { mode })
  await chmod(path, mode)
  return path
}

const requiredSecrets = (extra: string[] = []) =>
  [
    ...authSecrets,
    'QPAY_USERNAME=merchant-user',
    'QPAY_PASSWORD=merchant-password',
    'QPAY_INVOICE_CODE=AMERIK_VITAMIN_INVOICE',
    ...extra,
  ].join('\n')

afterEach(async () => {
  await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true })))
})

describe('Plugged development secrets file', () => {
  test('accepts the complete auth and QPay groups without Telegram', async () => {
    const path = await writeSecrets(requiredSecrets())

    await expect(validateDevelopmentSecretsFile(path)).resolves.toBe(path)
  })

  test('accepts Telegram only as one complete group', async () => {
    const path = await writeSecrets(
      requiredSecrets([
        'TELEGRAM_BOT_TOKEN=bot-token',
        'TELEGRAM_CHAT_ID=123',
        'TELEGRAM_WEBHOOK_SECRET=webhook-secret',
        'TELEGRAM_ADMIN_USER_ID=123',
      ]),
    )

    await expect(validateDevelopmentSecretsFile(path)).resolves.toBe(path)
  })

  test.each([
    ['a partial Telegram group', 'TELEGRAM_BOT_TOKEN=bot-token'],
    ['an unsupported key', 'EXTRA_SECRET=value'],
  ])('rejects %s', async (_, extra) => {
    const path = await writeSecrets(requiredSecrets([extra]))

    await expect(validateDevelopmentSecretsFile(path)).rejects.toThrow()
  })

  test('rejects a file that is not owner-only', async () => {
    const path = await writeSecrets(requiredSecrets(), 0o644)

    await expect(validateDevelopmentSecretsFile(path)).rejects.toThrow('mode 600')
  })
})
