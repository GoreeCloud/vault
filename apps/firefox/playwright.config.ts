import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir:'./e2e',
  fullyParallel:false,
  workers:1,
  retries:0,
  reporter:'list',
  use:{baseURL:'http://127.0.0.1:4291'},
  projects:[{name:'firefox-popup-mock',use:{...devices['Desktop Firefox']}}],
  webServer:{
    command:'npm run dev -- --port 4291',
    url:'http://127.0.0.1:4291/popup.html',
    reuseExistingServer:false,
    timeout:60000,
  },
});
