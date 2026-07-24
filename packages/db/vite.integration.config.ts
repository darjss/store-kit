import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vite-plus'

const migrationsDirectory = join(import.meta.dirname, 'migrations')
const migrations = readdirSync(migrationsDirectory, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .toSorted((left, right) => left.name.localeCompare(right.name))
  .map(entry => {
    const name = `${entry.name}/migration.sql`
    const source = readFileSync(join(migrationsDirectory, name), 'utf8')

    return {
      name,
      queries: source
        .split('--> statement-breakpoint')
        .map(query => query.trim())
        .filter(Boolean),
    }
  })

export default defineConfig({
  plugins: [
    cloudflareTest({
      miniflare: {
        compatibilityDate: '2026-07-21',
        compatibilityFlags: ['nodejs_compat'],
        d1Databases: ['DB'],
        bindings: { TEST_MIGRATIONS: migrations },
      },
    }),
  ],
  test: {
    include: ['src/**/*.integration.ts'],
    setupFiles: ['./test/apply-migrations.ts'],
  },
})
