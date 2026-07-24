import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vite-plus'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    cloudflareTest(async () => ({
      main: path.join(root, 'integration/worker.ts'),
      wrangler: { configPath: path.join(root, 'apps/plugged/wrangler.jsonc') },
      miniflare: {
        bindings: {
          DEPLOYMENT_ENV: 'production',
          TEST_MIGRATIONS: await readD1Migrations(
            path.join(root, 'packages/db/migrations/20260723180551_old_karnak'),
          ),
          PUBLIC_APP_URL: 'https://plugged.mn',
          PUBLIC_MEDIA_BASE_URL: 'https://plugged.storekitcdn.darjs.dev/',
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
