import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const windowsBrowser = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(path => existsSync(path));
export default defineConfig({
  testDir: './e2e', fullyParallel: true, workers: 2, retries: 0, timeout: 45000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3210', trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || windowsBrowser } },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: { command: 'pnpm start --port 3210', url: 'http://127.0.0.1:3210', reuseExistingServer: false, timeout: 60000 },
});
