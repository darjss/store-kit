import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vite-plus'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      main: path.join(root, 'integration/worker.ts'),
      wrangler: { configPath: path.join(root, 'apps/plugged/wrangler.jsonc') },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(
            path.join(root, 'packages/db/migrations/20260723121839_overjoyed_captain_flint'),
          ),
          QPAY_USERNAME: 'integration-test',
          QPAY_PASSWORD: 'integration-test',
          QPAY_INVOICE_CODE: 'integration-test',
          QPAY_BASE_URL: 'https://example.com',
          TELEGRAM_BOT_TOKEN: 'integration-test-invalid-token',
          TELEGRAM_CHAT_ID: '-1',
          TELEGRAM_WEBHOOK_SECRET: 'integration-test-secret',
          TELEGRAM_ADMIN_USER_ID: '42',
        },
      },
    })),
  ],
  test: {
    include: ['packages/**/*.integration.ts'],
    setupFiles: ['./integration/apply-migrations.ts'],
    testTimeout: 30_000,
  },
})
