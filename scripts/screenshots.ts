#!/usr/bin/env bun
/**
 * Generates README screenshots for every screen × light + dark theme.
 *
 * Prereq: `make dev` (FE on :3041, BE on :4001) must be running.
 *
 * Output: docs/screenshots/<screen>-<theme>.png
 *
 * Run:
 *   bun run scripts/screenshots.ts
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'http://localhost:3041';
const OUT_DIR = path.join(import.meta.dir, '..', 'docs', 'screenshots');
const VIEWPORT = { width: 1440, height: 900 };

const SCREENS = [
  { name: 'login', path: '/login', requireAuth: false, waitFor: 'input[type="email"]' },
  { name: 'invoices-list', path: '/', requireAuth: true, waitFor: 'h1' },
  { name: 'invoice-detail', path: null, requireAuth: true, waitFor: 'h1' }, // resolved at runtime
  { name: 'create-invoice', path: '/invoices/new', requireAuth: true, waitFor: 'h1' },
  { name: 'edit-invoice', path: null, requireAuth: true, waitFor: 'h1' }, // resolved at runtime
] as const;

async function loginAndSeed(context: import('playwright').BrowserContext) {
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('#email', 'admin@simpleinvoice.com');
  await page.fill('#password', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
  // Wait for the table body to populate (SWR fetch needs to complete).
  await page.waitForSelector('tbody tr td a[href^="/invoices/"]', { timeout: 10000 });
  // Grab the first invoice id (for detail + edit shots).
  // Skip the "/invoices/new" link belonging to the New Invoice button —
  // pick the first link that goes to an actual invoice (matches a UUID).
  const hrefs = await page.locator('a[href^="/invoices/"]').evaluateAll((els) =>
    (els as HTMLAnchorElement[]).map((a) => a.getAttribute('href') ?? ''),
  );
  const realHref = hrefs.find((h) => h && h !== '/invoices/new' && !h.endsWith('/edit'));
  const firstId = realHref?.replace('/invoices/', '');
  // Persist auth token, then return so dark-mode runs reuse it.
  await page.close();
  return firstId;
}

async function snap(page: import('playwright').Page, name: string, theme: 'light' | 'dark') {
  const file = path.join(OUT_DIR, `${name}-${theme}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  ✓ ${path.relative(process.cwd(), file)}`);
}

async function setTheme(page: import('playwright').Page, theme: 'light' | 'dark') {
  await page.evaluate((t) => {
    localStorage.setItem('theme', t);
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.style.colorScheme = t;
  }, theme);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT });

  // Login once, capture cookies + a first invoice id.
  console.log('Authenticating…');
  const firstInvoiceId = await loginAndSeed(context);
  if (!firstInvoiceId) {
    throw new Error('Could not resolve a first invoice id — is the DB seeded?');
  }
  console.log(`First invoice id: ${firstInvoiceId}\n`);

  for (const theme of ['light', 'dark'] as const) {
    console.log(`${theme.toUpperCase()} mode:`);
    for (const screen of SCREENS) {
      // Login screen needs an UNauthenticated session — otherwise
      // GuestRoute bounces us to "/". Use a fresh context for that one.
      const ctx = !screen.requireAuth ? await browser.newContext({ viewport: VIEWPORT }) : context;
      const page = await ctx.newPage();
      const url =
        screen.path ??
        (screen.name === 'invoice-detail'
          ? `/invoices/${firstInvoiceId}`
          : `/invoices/${firstInvoiceId}/edit`);

      // Set theme BEFORE the React app boots so the initial paint is correct.
      await page.addInitScript((t) => {
        localStorage.setItem('theme', t);
        localStorage.setItem('lang', 'en');
      }, theme);
      await page.goto(`${BASE}${url}`);
      await setTheme(page, theme);
      try {
        await page.waitForSelector(screen.waitFor, { timeout: 5000 });
      } catch {
        // Fall through and screenshot whatever rendered.
      }
      // Give Vite/SWR a beat to settle skeletons.
      await page.waitForTimeout(800);
      await snap(page, screen.name, theme);
      await page.close();
      if (!screen.requireAuth) await ctx.close();
    }
    console.log('');
  }

  await browser.close();
  console.log(`Saved to ${path.relative(process.cwd(), OUT_DIR)}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
