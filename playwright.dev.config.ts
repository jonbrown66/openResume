import { defineConfig } from '@playwright/test';
import config from './playwright.config';

export default defineConfig({
  ...config,
  outputDir: './test-results/dev',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/dev' }]],
  use: { ...config.use, baseURL: 'http://localhost:3000' },
  webServer: [],
});
