import { chromium, type FullConfig } from 'playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Global setup — runs once before any test starts.
 *
 * Logs in as admin and saves the resulting localStorage (Zustand auth
 * store) + cookies to `.auth/admin.json`. The `authenticated` project
 * in playwright.config.ts loads that file as `storageState` so every
 * spec starts already-signed-in.
 *
 * Doing it once here means we don't burn ~1s per test re-typing
 * credentials, AND test failures around login itself are isolated to
 * the dedicated guest specs.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3041';
  const storagePath = path.join(__dirname, '.auth', 'admin.json');

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  await page.goto('/login');
  await page.fill('#email', 'admin@simpleinvoice.com');
  await page.fill('#password', 'password123');
  await page.click('button[type="submit"]');
  // Wait for the redirect to settle and the list to render so the
  // Zustand persist write has actually happened.
  await page.waitForURL('/');
  await page.waitForSelector('tbody tr', { timeout: 10_000 });

  await context.storageState({ path: storagePath });
  await browser.close();

  // eslint-disable-next-line no-console
  console.log(`[e2e] auth state saved → ${path.relative(process.cwd(), storagePath)}`);
}
