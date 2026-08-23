import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E + visual regression config for MetaMark.
 *
 * Runs against the production build (vite build + vite preview) rather than
 * the dev server, so visual snapshots are reproducible and match what's
 * actually deployed. `webServer` handles starting it and waiting for
 * readiness, so `npm run test:e2e` is self-sufficient both locally and in
 * CI — no separate manual build/serve step is required.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  outputDir: 'test-results',

  use: {
    baseURL: 'http://localhost:3000',
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
    trace: 'retain-on-failure',
  },

  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
