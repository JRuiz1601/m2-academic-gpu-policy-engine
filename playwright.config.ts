import { defineConfig } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 4173);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test/evidence/e2e/results.json' }]],
  outputDir: 'test-results',
  use: { baseURL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'node --disable-warning=ExperimentalWarning tests/e2e/start-server.mjs',
    url: `${baseURL}/health`,
    wait: { stdout: /M2 listening at http:\/\/127\.0\.0\.1:\d+/ },
    reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
    env: { E2E_PORT: String(port) },
  },
});
