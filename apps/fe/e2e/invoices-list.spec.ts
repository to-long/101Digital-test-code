import { test, expect } from 'playwright/test';

/**
 * Invoice list — browsing, filtering, sorting, paging.
 *
 * Uses the seeded 100-invoice dataset. Assertions are written to be
 * tolerant of seed regeneration: we assert relative properties
 * ("every row shows Paid") rather than absolute counts or specific
 * invoice numbers.
 */

test.describe('Feature: Browse invoices', () => {
  test('Scenario: default page shows 10 rows and pagination', async ({ page }) => {
    // Given an authenticated user on the home route
    await page.goto('/');

    // Then the list renders with 10 rows and a pagination footer
    await expect(page.locator('tbody tr')).toHaveCount(10);
    await expect(page.getByText(/showing 1.+10 of/i)).toBeVisible();
  });

  test('Scenario: filtering by status=Paid only shows Paid rows', async ({ page }) => {
    // Given the home route — wait for rows to land first
    await page.goto('/');
    await expect(page.locator('tbody tr').first()).toBeVisible();

    // When the user picks the Paid filter
    await page.selectOption('select', 'Paid');
    await page.waitForURL(/status=Paid/);
    // SWR briefly keeps previous data — wait a tick for refetch
    await page.waitForTimeout(500);

    // Then every status badge (last cell .text-center > span) reads Paid
    const statusCells = page.locator('tbody tr td.text-center > span');
    const texts = await statusCells.allTextContents();
    expect(texts.length).toBeGreaterThan(0);
    for (const t of texts) expect(t.trim()).toBe('Paid');
  });

  test('Scenario: paid invoices hide edit + delete actions; view stays', async ({ page }) => {
    // Given filter is Paid
    await page.goto('/?status=Paid');

    // Then the first row's action cell has only the View affordance
    const firstActions = page.locator('tbody tr').first().locator('td').last();
    await expect(firstActions.locator('[aria-label="View"]')).toBeVisible();
    await expect(firstActions.locator('[aria-label="Edit"]')).toHaveCount(0);
    await expect(firstActions.locator('[aria-label="Delete"]')).toHaveCount(0);
  });

  test('Scenario: sorting cycles ASC → DESC → cleared on three clicks', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('tbody tr').first()).toBeVisible();

    const header = page.locator('th', { hasText: 'Invoice Date' });

    // 1st click — ASC
    await header.click();
    await page.waitForURL(/sortBy=invoiceDate/);
    await expect(page).toHaveURL(/ordering=ASC/);

    // 2nd click — DESC
    await header.click();
    await expect(page).toHaveURL(/ordering=DESC/);

    // 3rd click — cleared (param removed)
    await header.click();
    await expect(page).not.toHaveURL(/sortBy=invoiceDate/);
  });

  test('Scenario: invoice number links to the detail page', async ({ page }) => {
    await page.goto('/');

    // Capture the first row's invoice number, then click it
    const firstNumber = (await page.locator('tbody tr td a').first().textContent())?.trim();
    await page.locator('tbody tr td a').first().click();

    // Then the detail page loads with the same invoice number visible
    await page.waitForURL(/\/invoices\/[0-9a-f-]+$/i);
    await expect(page.getByText(firstNumber!).first()).toBeVisible();
  });
});

test.describe('Feature: URL state is shareable', () => {
  test('Scenario: filters + page persist across reload', async ({ page }) => {
    // Given a filtered view at a specific page
    await page.goto('/?status=Pending&page=2');
    await page.waitForSelector('tbody tr');

    // When the page is reloaded
    await page.reload();

    // Then the filter + page are still applied
    await expect(page).toHaveURL(/status=Pending/);
    await expect(page).toHaveURL(/page=2/);
    await expect(page.locator('tbody tr').first()).toBeVisible();
  });
});
