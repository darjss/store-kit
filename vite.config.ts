import { defineConfig } from 'vite-plus'

import formatConfig from './oxfmt.config'
import lintConfig from './oxlint.config'

export default defineConfig({
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
