import { test, expect } from 'playwright/test';
import { uniqueInvoiceNumber, fillCreateInvoiceForm } from './helpers';

/**
 * Invoice lifecycle — full create → edit → delete journey through the UI.
 *
 * Each scenario picks a unique invoice number so re-runs don't fight
 * over the UNIQUE(invoice_number) constraint. After the delete scenario
 * passes, the row is soft-removed; the BE keeps the audit row but the
 * UI is fully clean.
 */

test.describe('Feature: Create an invoice', () => {
  test('Scenario: happy path saves a Draft and returns to the list', async ({ page }) => {
    const number = uniqueInvoiceNumber('CREATE');

    // Given the user is on the Create page
    await page.goto('/invoices/new');
    await expect(page.getByRole('heading', { name: /create invoice/i })).toBeVisible();

    // When they fill the form and click Save
    await fillCreateInvoiceForm(page, { invoiceNumber: number });
    await page.click('button:has-text("Save")');

    // Then a success toast appears and they're back on the list
    await expect(page.getByText(/invoice created/i)).toBeVisible({ timeout: 5000 });
    await page.waitForURL('/');

    // And the new invoice is searchable. Scope to tbody so we don't
    // also match the lingering "saved as Draft" toast text.
    await page.fill('input[placeholder*="Search"]', number);
    await page.keyboard.press('Enter');
    await expect(page.locator('tbody').getByText(number)).toBeVisible();
  });

  test('Scenario: due date before invoice date is rejected client-side', async ({ page }) => {
    const number = uniqueInvoiceNumber('BAD-DATES');
    await page.goto('/invoices/new');

    await fillCreateInvoiceForm(page, {
      invoiceNumber: number,
      invoiceDate: '2026-03-15',
      dueDate: '2026-01-15',
    });
    await page.click('button:has-text("Save")');

    // The Zod refinement attaches the error to the dueDate field
    await expect(
      page.getByText(/due date must be on or after invoice date/i),
    ).toBeVisible({ timeout: 3000 });
    // We never navigated away — still on the form
    await expect(page).toHaveURL(/\/invoices\/new$/);
  });
});

test.describe('Feature: Edit an invoice', () => {
  test('Scenario: editing a Draft updates the customer name', async ({ page }) => {
    const number = uniqueInvoiceNumber('EDIT');

    // Given an invoice exists (create it through the UI)
    await page.goto('/invoices/new');
    await fillCreateInvoiceForm(page, { invoiceNumber: number, customerName: 'Original' });
    await page.click('button:has-text("Save")');
    await page.waitForURL('/');

    // Open the freshly-created invoice via the search → row click
    await page.fill('input[placeholder*="Search"]', number);
    await page.keyboard.press('Enter');
    await page.locator('tbody').getByText(number).click();
    await page.waitForURL(/\/invoices\/[0-9a-f-]+$/i);

    // When the user navigates to Edit and changes the customer
    await page.click('button:has-text("Edit")');
    await page.waitForURL(/\/edit$/);
    await page.fill('input[name="customer.fullname"]', 'Updated by E2E');
    await page.click('button:has-text("Update")');

    // Then a success toast appears and the detail shows the new name
    await expect(page.getByText(/invoice updated/i)).toBeVisible({ timeout: 5000 });
    await page.waitForURL(/\/invoices\/[0-9a-f-]+$/i);
    await expect(page.getByText('Updated by E2E')).toBeVisible();
  });
});

test.describe('Feature: Soft delete an invoice', () => {
  test('Scenario: deleting from the detail page removes it from the list', async ({ page }) => {
    const number = uniqueInvoiceNumber('DELETE-DETAIL');

    // Given a Draft invoice exists (created via UI)
    await page.goto('/invoices/new');
    await fillCreateInvoiceForm(page, { invoiceNumber: number });
    await page.click('button:has-text("Save")');
    await page.waitForURL('/');

    // Find and open the new invoice
    await page.fill('input[placeholder*="Search"]', number);
    await page.keyboard.press('Enter');
    await page.locator('tbody').getByText(number).click();
    await page.waitForURL(/\/invoices\/[0-9a-f-]+$/i);

    // When the user clicks the Delete icon and confirms
    await page.click('[aria-label="Delete"]');
    await expect(page.getByRole('dialog')).toBeVisible();
    // The confirm button inside the dialog is the second one (Cancel is first)
    await page.locator('div[role="dialog"]').getByRole('button', { name: /delete/i }).click();

    // Then a toast confirms deletion and the user is on the list
    await expect(page.getByText(/invoice deleted/i)).toBeVisible({ timeout: 5000 });
    await page.waitForURL('/');

    // And the row is no longer findable
    await page.fill('input[placeholder*="Search"]', number);
    await page.keyboard.press('Enter');
    await expect(page.getByText(/no invoices found/i)).toBeVisible();
  });

  test('Scenario: deleting from the list row also works', async ({ page }) => {
    const number = uniqueInvoiceNumber('DELETE-LIST');

    // Given an invoice we'll delete from the list
    await page.goto('/invoices/new');
    await fillCreateInvoiceForm(page, { invoiceNumber: number });
    await page.click('button:has-text("Save")');
    await page.waitForURL('/');

    // Locate the row via search, then click its 🗑 icon
    await page.fill('input[placeholder*="Search"]', number);
    await page.keyboard.press('Enter');
    const row = page.locator(`tbody tr:has-text("${number}")`);
    await row.locator('[aria-label="Delete"]').click();

    // Confirm in dialog
    await page.locator('div[role="dialog"]').getByRole('button', { name: /delete/i }).click();

    // Toast + row disappears
    await expect(page.getByText(/invoice deleted/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/no invoices found/i)).toBeVisible({ timeout: 5000 });
  });
});
