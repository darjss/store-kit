import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4321'

export default defineConfig({
  testDir: './packages/admin/e2e',
  testMatch: '**/*.browser.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: 'line',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      'node --experimental-strip-types packages/tooling/admin-browser-prepare.ts && cd apps/plugged && vp exec wrangler dev --local --ip 127.0.0.1 --port 4321 --persist-to .wrangler/admin-browser --env-file .astro/admin-browser/worker.vars --show-interactive-dev-session=false',
    url: `${baseURL}/api/system/status`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
