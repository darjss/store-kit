import { config } from '@letstri/oxlint-config'
import { tailwindConfig } from '@letstri/oxlint-config/tailwind'

export default config(tailwindConfig({ entryPoint: 'packages/ui/src/styles.css' }), {
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
})
