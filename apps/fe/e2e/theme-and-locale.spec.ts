import { test, expect } from 'playwright/test';

/**
 * Theme + locale — verifies the user dropdown controls actually flip
 * the UI chrome and the i18n catalog.
 */

test.describe('Feature: Dark mode toggle', () => {
  test('Scenario: switching to Dark adds the .dark class to <html>', async ({ page }) => {
    await page.goto('/');

    // Open the user dropdown in the breadcrumb header
    await page.locator('header button[aria-haspopup="menu"]').first().click();

    // Click Dark in the theme segmented control
    await page.getByRole('radio', { name: /dark/i }).click();

    // Verify <html> now carries .dark
    await expect(page.locator('html')).toHaveClass(/dark/);

    // And the choice is persisted in localStorage for next reload
    const stored = await page.evaluate(() => localStorage.getItem('theme'));
    expect(stored).toBe('dark');
  });

  test('Scenario: System mode follows the OS preference', async ({ browser }) => {
    // Force a dark-OS context
    const context = await browser.newContext({
      colorScheme: 'dark',
      storageState: './e2e/.auth/admin.json',
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto('http://localhost:3041/');

    // Explicitly select System
    await page.locator('header button[aria-haspopup="menu"]').first().click();
    await page.getByRole('radio', { name: /system/i }).click();

    // Because the emulated OS is dark, <html> should carry .dark
    await expect(page.locator('html')).toHaveClass(/dark/);
    await context.close();
  });
});

test.describe('Feature: Language switcher', () => {
  // The language tabs use short codes (EN / VI / 中) for the button text
  // — their accessible name. The full language name is in `title=` for
  // hover/screen reader hints. So we match by the title attribute rather
  // than getByRole({ name }).

  test('Scenario: switching to Tiếng Việt translates the chrome', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /invoices/i, level: 1 })).toBeVisible();

    await page.locator('header button[aria-haspopup="menu"]').first().click();
    await page.locator('[title="Tiếng Việt"]').click();

    await expect(page.getByRole('heading', { name: /hoá đơn/i, level: 1 })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('lang'))).toBe('vi');
  });

  test('Scenario: switching to 中文 translates the breadcrumb', async ({ page }) => {
    await page.goto('/');

    await page.locator('header button[aria-haspopup="menu"]').first().click();
    await page.locator('[title="中文"]').click();

    await expect(page.locator('header').getByText('发票')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('lang'))).toBe('zh');
  });
});
