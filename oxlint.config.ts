import { config } from '@letstri/oxlint-config'
import { tailwindConfig } from '@letstri/oxlint-config/tailwind'

export default config(tailwindConfig({ entryPoint: 'packages/ui/src/styles.css' }), {
  overrides: [
    {
      files: ['packages/{admin,tooling}/index.ts'],
      rules: { 'unicorn/no-empty-file': 'off' },
    },
  ],
})
