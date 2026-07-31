import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parse } from 'jsonc-parser'
import { describe, expect, test } from 'vite-plus/test'

const wranglerConfigPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../apps/plugged/wrangler.jsonc',
)

type Binding = { binding: string; id?: string }
type R2Binding = Binding & { bucket_name: string; remote?: boolean }
type D1Binding = Binding & {
  database_name: string
  database_id?: string
  migrations_dir?: string
  migrations_pattern?: string
}
type WranglerEnvironment = {
  name: string
  d1_databases: D1Binding[]
  kv_namespaces: Binding[]
  r2_buckets: R2Binding[]
  images: { binding: string }
  vars: Record<string, string>
  secrets: { required: string[] }
  routes: { pattern: string; custom_domain?: boolean; zone_name?: string }[]
}
type WranglerConfig = {
  $schema: string
  compatibility_date: string
  compatibility_flags: string[]
  name: string
  main: string
  cache: { enabled: boolean }
  assets: { directory: string; binding: string }
  d1_databases: Omit<D1Binding, 'database_id'>[]
  kv_namespaces: Binding[]
  r2_buckets: R2Binding[]
  images: { binding: string }
  secrets: { required: string[] }
  vars: Record<string, string>
  env: { development: WranglerEnvironment; production: WranglerEnvironment }
  observability: { enabled: boolean }
}

const readConfig = async () => parse(await readFile(wranglerConfigPath, 'utf8')) as WranglerConfig

describe('Plugged Wrangler deployment configuration', () => {
  test('preserves the root production configuration', async () => {
    const { env: _, ...root } = await readConfig()

    expect(root).toEqual({
      $schema: './node_modules/wrangler/config-schema.json',
      compatibility_date: '2026-07-21',
      compatibility_flags: ['global_fetch_strictly_public', 'nodejs_compat'],
      name: 'plugged',
      main: '@astrojs/cloudflare/entrypoints/server',
      cache: { enabled: true },
      assets: { directory: './dist', binding: 'ASSETS' },
      d1_databases: [
        {
          binding: 'DB',
          database_name: 'plugged',
          migrations_dir: '../../packages/db/migrations',
          migrations_pattern: '../../packages/db/migrations/*/migration.sql',
        },
      ],
      kv_namespaces: [{ binding: 'CACHE' }, { binding: 'AUTH_KV' }],
      r2_buckets: [{ binding: 'MEDIA', bucket_name: 'plugged' }],
      images: { binding: 'IMAGES' },
      secrets: {
        required: ['BETTER_AUTH_SECRETS', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
      },
      vars: {
        DEPLOYMENT_ENV: 'production',
        PUBLIC_APP_URL: 'https://pluggedaudio.store',
        PUBLIC_MEDIA_BASE_URL: 'https://plugged.storekitcdn.darjs.dev/',
        QPAY_BASE_URL: 'https://merchant.qpay.mn',
      },
      observability: { enabled: true },
    })
  })

  test('pins production to Store Kit resources and the Plugged custom route', async () => {
    const production = (await readConfig()).env.production
    const database = production.d1_databases.find(({ binding }) => binding === 'DB')
    const namespaces = Object.fromEntries(
      production.kv_namespaces.map(({ binding, id }) => [binding, id]),
    )

    expect(production.name).toBe('plugged')
    expect(database).toEqual({
      binding: 'DB',
      database_name: 'store-kit-plugged-production',
      database_id: '058685a7-d13c-4eb3-8464-b5286945a759',
      migrations_dir: '../../packages/db/migrations',
      migrations_pattern: '../../packages/db/migrations/*/migration.sql',
    })
    expect(namespaces).toEqual({
      CACHE: expect.stringMatching(/^[0-9a-f]{32}$/u),
      AUTH_KV: expect.stringMatching(/^[0-9a-f]{32}$/u),
      SESSION: expect.stringMatching(/^[0-9a-f]{32}$/u),
    })
    expect(new Set(Object.values(namespaces)).size).toBe(3)
    expect(production.vars).toEqual({
      DEPLOYMENT_ENV: 'production',
      PUBLIC_APP_URL: 'https://pluggedaudio.store',
      PUBLIC_MEDIA_BASE_URL: 'https://plugged.storekitcdn.darjs.dev/',
      QPAY_BASE_URL: 'https://merchant.qpay.mn',
    })
    expect(production.secrets.required).toEqual([
      'QPAY_USERNAME',
      'QPAY_PASSWORD',
      'QPAY_INVOICE_CODE',
    ])
    expect(production.routes).toEqual([
      {
        pattern: 'pluggedaudio.store/*',
        zone_name: 'pluggedaudio.store',
      },
    ])
  })

  test('pins the client demo to explicit development resources', async () => {
    const development = (await readConfig()).env.development
    const database = development.d1_databases.find(({ binding }) => binding === 'DB')
    const namespaces = Object.fromEntries(
      development.kv_namespaces.map(({ binding, id }) => [binding, id]),
    )

    expect(development.name).toBe('plugged-client-demo')
    expect(database).toMatchObject({
      database_name: 'plugged-client-demo',
      migrations_dir: '../../packages/db/migrations',
      migrations_pattern: '../../packages/db/migrations/*/migration.sql',
    })
    expect(database?.database_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    )
    expect(namespaces).toEqual({
      CACHE: expect.stringMatching(/^[0-9a-f]{32}$/u),
      AUTH_KV: expect.stringMatching(/^[0-9a-f]{32}$/u),
      SESSION: expect.stringMatching(/^[0-9a-f]{32}$/u),
    })
    expect(new Set(Object.values(namespaces)).size).toBe(3)
    expect(development.r2_buckets).toEqual([
      {
        binding: 'MEDIA',
        bucket_name: 'plugged-development-media',
        remote: true,
      },
    ])
    expect(development.images).toEqual({ binding: 'IMAGES' })
    expect(development.vars).toEqual({
      DEPLOYMENT_ENV: 'development',
      PUBLIC_APP_URL: 'https://storekit.plugged.darjs.dev',
      PUBLIC_MEDIA_BASE_URL: 'https://storekitcdn.plugged.darjs.dev/',
      QPAY_BASE_URL: 'https://merchant.qpay.mn',
    })
    expect(development.secrets.required).toEqual([
      'BETTER_AUTH_SECRETS',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'QPAY_USERNAME',
      'QPAY_PASSWORD',
      'QPAY_INVOICE_CODE',
    ])
    expect(development.routes).toEqual([
      {
        pattern: 'storekit.plugged.darjs.dev',
        custom_domain: true,
      },
    ])
  })
})
