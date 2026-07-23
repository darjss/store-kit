/// <reference types="@cloudflare/vitest-pool-workers/types" />

import { applyD1Migrations } from 'cloudflare:test'
import type { D1Migration } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { beforeAll } from 'vite-plus/test'

beforeAll(async () => {
  const testEnv = env as typeof env & { TEST_MIGRATIONS: D1Migration[] }
  await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS)
})
