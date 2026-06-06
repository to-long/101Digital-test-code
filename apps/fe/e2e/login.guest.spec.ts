import { test, expect } from 'playwright/test';

/**
 * Auth flow — runs in the `guest` project (no shared auth state).
 *
 * Covers the login screen's happy path + rejection paths. Doesn't
 * re-test the JWT contract itself (the BE BDD specs cover that) —
 * here we verify the UI plumbing: form → toast → redirect.
 */

test.describe('Feature: Sign in', () => {
  test('Scenario: valid credentials redirect to the invoice list', async ({ page }) => {
    // Given the login page
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // When the user submits valid credentials
    await page.fill('#email', 'admin@simpleinvoice.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    // Then they land on the invoice list with rows loaded
    await page.waitForURL('/');
    await expect(page.getByRole('heading', { name: /invoices/i })).toBeVisible();
    await expect(page.locator('tbody tr').first()).toBeVisible();
  });

  test('Scenario: wrong password keeps the user on the login screen + toasts an error', async ({
    page,
  }) => {
    // Given the login page
    await page.goto('/login');

    // When the user submits the wrong password
    await page.fill('#email', 'admin@simpleinvoice.com');
    await page.fill('#password', 'definitely-wrong');
    await page.click('button[type="submit"]');

    // Then a red toast appears and the URL stays at /login
    await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('Scenario: settings dropdown is reachable before signing in', async ({ page }) => {
    // Given the login page
    await page.goto('/login');

    // When the user clicks the ⚙ settings icon in the guest header
    await page.click('[aria-label="Settings"]');

    // Then a popover with theme + language pickers is shown
    await expect(page.getByRole('radiogroup', { name: /theme/i })).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: /language/i })).toBeVisible();
  });
});

test.describe('Feature: Guarded routes', () => {
  test('Scenario: deep-linking to a protected route bounces to /login when unauthenticated', async ({
    page,
  }) => {
    // Given no session
    // When the user navigates directly to an invoice page
    await page.goto('/invoices/new');

    // Then they're redirected to login (ProtectedRoute wrapper kicks in)
    await page.waitForURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });
});
