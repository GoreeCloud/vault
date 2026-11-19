import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  testMatch: '**/*.spec.mjs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 12_000 },
  use: {
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'off',
    video: 'off',
  },
});
