import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {baseURL: 'http://127.0.0.1:4282', trace: 'retain-on-failure'},
  projects: [
    {name: 'chromium',use: {...devices['Desktop Chrome']}},
    {name: 'firefox-browser',use: {...devices['Desktop Firefox']}},
  ],
  webServer: {
    command: 'npm run dev -- --port 4282',
    url: 'http://127.0.0.1:4282/',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
