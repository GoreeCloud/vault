import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir:'./production-tests',
  testMatch:'production-policy.spec.ts',
  fullyParallel:false,
  workers:1,
  retries:0,
  reporter:'list',
  use:{baseURL:'http://127.0.0.1:4811'},
  projects:[
    {name:'chromium-production',use:{...devices['Desktop Chrome']}},
    {name:'firefox-production',use:{...devices['Desktop Firefox']}},
  ],
  webServer:{
    command:'npm run build && npx vite preview --host 127.0.0.1 --port 4811 --strictPort',
    url:'http://127.0.0.1:4811/',
    reuseExistingServer:false,
    timeout:90_000,
  },
});
