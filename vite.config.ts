import { defineConfig } from 'vite-plus'

import formatConfig from './oxfmt.config'
import lintConfig from './oxlint.config'

export default defineConfig({
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
      'test:commerce:integration': {
        command: 'vp test --config vitest.integration.config.ts',
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
