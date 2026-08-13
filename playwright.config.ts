import { defineConfig, devices } from '@playwright/test';

// =============================================================================
// Playwright — tests e2e du frontend Audit
// Cible par défaut : l'application servie par Nginx sous http://localhost/audit
// (lancez d'abord `make up:ext` ou `make up`). Surchargeable via E2E_BASE_URL.
// Installation navigateur : npx playwright install chromium
// =============================================================================
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost/audit',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
