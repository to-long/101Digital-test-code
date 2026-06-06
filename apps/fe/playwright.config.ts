import { defineConfig, devices } from 'playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Playwright E2E config for the SimpleInvoice frontend.
 *
 * Tests are written against the **running dev stack** (BE on :4001, FE on
 * :3041) — same setup any developer already has via `make dev`. We don't
 * spin up a separate test server because:
 *   - the BE + DB seed is what we want to test against (real Drizzle, real
 *     bcrypt, real JWT), not a mock layer
 *   - per-test isolation is achieved through unique invoice numbers + soft
 *     delete cleanup, not a fresh DB per run
 *
 * Run:   bunx playwright test            (headless)
 *        bunx playwright test --ui       (interactive UI mode)
 *        bunx playwright test --headed   (see the browser)
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts$/,
  // Generated traces / videos / HTML report live here; gitignored.
  outputDir: './e2e/.results',
  reporter: [['list'], ['html', { outputFolder: './e2e/.report', open: 'never' }]],

  // One worker keeps test order deterministic — important because tests
  // share a database. With more workers we'd need a DB reset hook.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  use: {
    baseURL: 'http://localhost:3041',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Shared auth state: globalSetup logs in once and writes the storage
  // state to `.auth/admin.json`; every authenticated test reuses it
  // instead of clicking through the login form.
  globalSetup: path.resolve(__dirname, './e2e/global-setup.ts'),

  projects: [
    {
      name: 'guest',
      // No storageState — these specs hit /login first.
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      testMatch: /.*\.guest\.spec\.ts$/,
    },
    {
      name: 'authenticated',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        storageState: './e2e/.auth/admin.json',
      },
      testMatch: /.*(?<!\.guest)\.spec\.ts$/,
    },
  ],
});
