import solid from 'vite-plugin-solid'
import { defineConfig } from 'vite-plus'

import formatConfig from './oxfmt.config'
import lintConfig from './oxlint.config'

export default defineConfig({
  plugins: [solid({ hot: false })],
  resolve: { tsconfigPaths: true },
  ssr: {
    noExternal: [
      '@corvu/utils',
      '@kobalte/core',
      '@solar-icons/solid',
      '@store-kit/ui',
      '@store-kit/ui/utils',
      '@tanstack/solid-form',
      '@unpic/solid',
      '@unpic/solid/base',
      'cmdk-solid',
      'solid-prevent-scroll',
      'solid-presence',
      'solid-sonner',
      'unpic',
    ],
  },
  run: {
    tasks: {
      'db:generate': {
        command: 'vp exec drizzle-kit generate --config drizzle.config.ts',
        cwd: 'packages/db',
        cache: false,
      },
      'db:migrate:plugged:local': {
        command: 'vp exec wrangler d1 migrations apply DB --local',
        cwd: 'apps/plugged',
        cache: false,
      },
      'db:migrate:plugged:remote-only': {
        command: 'vp exec wrangler d1 migrations apply DB --remote',
        cwd: 'apps/plugged',
        cache: false,
      },
      'catalog:seed:plugged': {
        command: 'node --experimental-strip-types catalog-seed.ts',
        cwd: 'packages/tooling',
        cache: false,
      },
      'plugged:dev': {
        command: 'vp exec astro dev --background --host 127.0.0.1',
        cwd: 'apps/plugged',
        cache: false,
      },
      'plugged:dev:status': {
        command: 'vp exec astro dev status',
        cwd: 'apps/plugged',
        cache: false,
      },
      'plugged:dev:stop': {
        command: 'vp exec astro dev stop',
        cwd: 'apps/plugged',
        cache: false,
      },
      'plugged:route': {
        command: 'node --experimental-strip-types ../../scripts/portless-alias.ts plugged',
        cwd: 'apps/plugged',
        cache: false,
      },
      'test:commerce:integration': {
        command: 'vp test --config vitest.integration.config.ts',
        cache: false,
      },
      'db:test:integration': {
        command: 'vp test run --config vite.integration.config.ts',
        cwd: 'packages/db',
        cache: false,
      },
    },
  },
  staged: {
    '*': 'vp check --fix',
  },
  fmt: {
    ...formatConfig,
    ignorePatterns: [...(formatConfig.ignorePatterns ?? []), '**/worker-configuration.d.ts'],
  },
  lint: {
    ...lintConfig,
    ignorePatterns: [...(lintConfig.ignorePatterns ?? []), '**/worker-configuration.d.ts'],
    jsPlugins: [
      ...(lintConfig.jsPlugins ?? []),
      { name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' },
    ],
    rules: {
      ...lintConfig.rules,
      'vite-plus/prefer-vite-plus-imports': 'error',
    },
    options: { typeAware: true, typeCheck: true },
  },
})
