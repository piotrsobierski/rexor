import { defineConfig } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://rexor.sobierski.com';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 1000 },
    screenshot: 'off',
    trace: 'off',
  },
});
