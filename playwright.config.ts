import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { resolveContext } from './src/helpers/environment.helper';

const context = resolveContext();
export const STORAGE_STATE_PATH = path.resolve(process.cwd(), 'playwright/.auth/user.json');

/**
 * Enterprise Playwright Configuration
 * - Dynamic Tenant + Environment URL resolution (`resolveContext()`)
 * - Pinned timezone (`context.timezoneId`) so date/time checks never drift across regions
 * - Setup dependency chain: `auth-setup` -> `seed-data` (dev only) -> browser projects
 * - Production safety lock: When `ENV=prod`, forces `grep: /@prod-safe/` automatically
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },

  /* Automatic production safety lock: only @prod-safe specs can run when ENV=prod */
  grep: context.environment === 'prod' ? /@prod-safe/ : undefined,

  reporter: process.env.CI
    ? [
        ['list'],
        ['html', { open: 'never' }],
        ['junit', { outputFile: 'test-results/junit-results.xml' }],
      ]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: context.baseURL,
    timezoneId: context.timezoneId,
    testIdAttribute: 'data-test',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      slowMo: process.env.SLOWMO ? Number.parseInt(process.env.SLOWMO, 10) : 0,
    },
  },

  projects: [
    /* 1. Authenticate once through SSO/IAM and persist session state */
    {
      name: 'auth-setup',
      testDir: './tests/setup',
      testMatch: /auth\.setup\.ts/,
    },

    /* 2. Seed baseline dev data for read-only specs (non-blocking warning on failure) */
    {
      name: 'seed-data',
      testDir: './tests/setup',
      testMatch: /seed-data\.setup\.ts/,
      dependencies: ['auth-setup'],
      use: {
        storageState: STORAGE_STATE_PATH,
      },
    },

    /* 3. Browser Execution Projects (each spec runs in an isolated context from saved storageState) */
    {
      name: 'chromium',
      testDir: './tests/e2e',
      dependencies: ['seed-data'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE_PATH,
      },
    },
    {
      name: 'firefox',
      testDir: './tests/e2e',
      dependencies: ['seed-data'],
      use: {
        ...devices['Desktop Firefox'],
        storageState: STORAGE_STATE_PATH,
      },
    },
    {
      name: 'webkit',
      testDir: './tests/e2e',
      dependencies: ['seed-data'],
      use: {
        ...devices['Desktop Safari'],
        storageState: STORAGE_STATE_PATH,
      },
    },
  ],
});
