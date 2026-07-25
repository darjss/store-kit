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
  vars: Record<string, string>
  secrets: { required: string[] }
  routes: { pattern: string; custom_domain: boolean }[]
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
  vars: Record<string, string>
  env: { development: WranglerEnvironment }
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
      vars: {
        DEPLOYMENT_ENV: 'production',
        PUBLIC_APP_URL: 'https://plugged.mn',
        PUBLIC_MEDIA_BASE_URL: 'https://plugged.storekitcdn.darjs.dev/',
        QPAY_BASE_URL: 'https://merchant.qpay.mn',
      },
      observability: { enabled: true },
    })
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
    expect(development.vars).toEqual({
      DEPLOYMENT_ENV: 'development',
      PUBLIC_APP_URL: 'https://storekit.plugged.darjs.dev',
      PUBLIC_MEDIA_BASE_URL: 'https://storekitcdn.plugged.darjs.dev/',
      QPAY_BASE_URL: 'https://merchant.qpay.mn',
    })
    expect(development.secrets.required).toEqual([
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
