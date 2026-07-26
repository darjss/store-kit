import { fileURLToPath } from 'node:url'

import { config } from '@letstri/oxlint-config'
import { tailwindConfig } from '@letstri/oxlint-config/tailwind'

const workspaceRoot = fileURLToPath(new URL('.', import.meta.url))
const uiStyles = fileURLToPath(new URL('packages/ui/src/styles.css', import.meta.url))
const dundStyles = fileURLToPath(
  new URL('apps/demo-solid-store/src/styles/global.css', import.meta.url),
)

export default config(
  tailwindConfig({
    entryPoint: [
      { files: 'apps/demo-solid-store/**', use: dundStyles },
      { files: '**', use: uiStyles },
    ],
    cwd: workspaceRoot,
  }),
  {
    rules: {
      'eslint/no-underscore-dangle': ['error', { allow: ['_tag'] }],
    },
    overrides: [
      {
        files: [
          'apps/*/src/**/*.{astro,ts,tsx}',
          'packages/{api,commerce,storefront,ui}/src/**/*.{astro,ts,tsx}',
        ],
        rules: { 'import/no-relative-parent-imports': 'error' },
      },
      {
        files: ['packages/{admin,tooling}/index.ts'],
        rules: { 'unicorn/no-empty-file': 'off' },
      },
    ],
  },
)
