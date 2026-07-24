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
      'db:migrate:plugged:development': {
        command:
          'node --experimental-strip-types cloudflare-command.ts --environment development --operation migrate',
        cwd: 'packages/tooling',
        cache: false,
      },
      'db:migrate:plugged:production': {
        command:
          'node --experimental-strip-types cloudflare-command.ts --environment production --operation migrate',
        cwd: 'packages/tooling',
        cache: false,
      },
      'catalog:media:plugged:development': {
        command:
          'node --experimental-strip-types catalog-seed.ts --environment development --only media',
        cwd: 'packages/tooling',
        cache: false,
      },
      'catalog:seed:plugged:development': {
        command:
          'node --experimental-strip-types catalog-seed.ts --environment development --only data',
        cwd: 'packages/tooling',
        cache: false,
      },
      'catalog:media:plugged:production': {
        command:
          'node --experimental-strip-types catalog-seed.ts --environment production --only media',
        cwd: 'packages/tooling',
        cache: false,
      },
      'catalog:seed:plugged:production': {
        command:
          'node --experimental-strip-types catalog-seed.ts --environment production --only data',
        cwd: 'packages/tooling',
        cache: false,
      },
      'plugged:generate-types': {
        command: 'vp exec wrangler types',
        cwd: 'apps/plugged',
        cache: false,
      },
      'plugged:deploy:dry-run:development': {
        command:
          'node --experimental-strip-types cloudflare-command.ts --environment development --operation dry-run',
        cwd: 'packages/tooling',
        cache: false,
      },
      'plugged:deploy:development': {
        command:
          'node --experimental-strip-types cloudflare-command.ts --environment development --operation deploy',
        cwd: 'packages/tooling',
        cache: false,
      },
      'plugged:deploy:production': {
        command:
          'node --experimental-strip-types cloudflare-command.ts --environment production --operation deploy',
        cwd: 'packages/tooling',
        cache: false,
      },
      'plugged:rollback:development': {
        command:
          'node --experimental-strip-types cloudflare-command.ts --environment development --operation rollback',
        cwd: 'packages/tooling',
        cache: false,
      },
      'plugged:rollback:production': {
        command:
          'node --experimental-strip-types cloudflare-command.ts --environment production --operation rollback',
        cwd: 'packages/tooling',
        cache: false,
      },
      'plugged:secret-names:development': {
        command:
          'node --experimental-strip-types cloudflare-command.ts --environment development --operation secret-names',
        cwd: 'packages/tooling',
        cache: false,
      },
      'plugged:secret-names:production': {
        command:
          'node --experimental-strip-types cloudflare-command.ts --environment production --operation secret-names',
        cwd: 'packages/tooling',
        cache: false,
      },
      'plugged:smoke:development': {
        command: 'node --experimental-strip-types deployment-smoke.ts --environment development',
        cwd: 'packages/tooling',
        cache: false,
      },
      'plugged:smoke:production': {
        command: 'node --experimental-strip-types deployment-smoke.ts --environment production',
        cwd: 'packages/tooling',
        cache: false,
      },
      'plugged:scan-build-media': {
        command: 'node --experimental-strip-types media-build-scan.ts',
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
