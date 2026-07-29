import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { createId } from '@store-kit/db/ids'

const appDirectory = resolve(import.meta.dirname, '../../apps/plugged')
const stateDirectory = resolve(appDirectory, '.astro/admin-browser')
const persistenceDirectory = resolve(appDirectory, '.wrangler/admin-browser')
const varsPath = resolve(stateDirectory, 'worker.vars')
const seedPath = resolve(stateDirectory, 'seed.sql')
const appUrl = 'http://127.0.0.1:4321'
const authSecret = 'admin-browser-auth-secret-at-least-thirty-two-characters'

const run = (command: string, args: string[]) => {
  const result = spawnSync(command, args, { cwd: appDirectory, stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed.`)
}

const sqlText = (value: string) => `'${value.replaceAll("'", "''")}'`

rmSync(stateDirectory, { force: true, recursive: true })
rmSync(persistenceDirectory, { force: true, recursive: true })
mkdirSync(stateDirectory, { recursive: true })

writeFileSync(
  varsPath,
  [
    'DEPLOYMENT_ENV=development',
    `PUBLIC_APP_URL=${appUrl}`,
    'PUBLIC_MEDIA_BASE_URL=https://browser-media.invalid/',
    `BETTER_AUTH_SECRETS=1:${authSecret}`,
    'GOOGLE_CLIENT_ID=admin-browser-google-client-id',
    'GOOGLE_CLIENT_SECRET=admin-browser-google-client-secret',
    'QPAY_USERNAME=admin-browser',
    'QPAY_PASSWORD=admin-browser',
    'QPAY_INVOICE_CODE=admin-browser',
    'QPAY_BASE_URL=https://merchant-sandbox.qpay.mn',
    'TELEGRAM_BOT_TOKEN=admin-browser',
    'TELEGRAM_CHAT_ID=-1',
    'TELEGRAM_WEBHOOK_SECRET=admin-browser',
    'TELEGRAM_ADMIN_USER_ID=1',
    '',
  ].join('\n'),
  { mode: 0o600 },
)

run('vp', ['exec', 'astro', 'build'])
run('vp', [
  'exec',
  'wrangler',
  'd1',
  'migrations',
  'apply',
  'DB',
  '--local',
  '--persist-to',
  persistenceDirectory,
])

const now = Date.now()
const userId = createId('authUser')
const sessionId = createId('authSession')
const token = 'admin-browser-session-token-for-real-better-auth'
const expiresAt = now + 60 * 60 * 1000

writeFileSync(
  seedPath,
  `insert into user
    (id, name, email, email_verified, approved, created_at, updated_at)
   values (${sqlText(userId)}, 'Browser Admin', 'browser-admin@example.com', 1, 1, ${now}, ${now});
   insert into session
    (id, user_id, token, expires_at, created_at, updated_at)
   values (${sqlText(sessionId)}, ${sqlText(userId)}, ${sqlText(token)}, ${expiresAt}, ${now}, ${now});
   insert into checkout_settings
    (id, delivery_fee_mnt, bank_name, bank_account_name, bank_account_number, updated_at)
   values ('cfg_00000000000000000000000001', 5000, 'Browser Bank', 'Browser Store', '001', ${now});
`,
  { mode: 0o600 },
)
run('vp', [
  'exec',
  'wrangler',
  'd1',
  'execute',
  'DB',
  '--local',
  '--persist-to',
  persistenceDirectory,
  '--file',
  seedPath,
])
