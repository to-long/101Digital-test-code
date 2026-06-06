import type { Page } from 'playwright/test';

/**
 * Random unique invoice number so parallel runs / re-runs don't collide
 * on the server's UNIQUE constraint.
 */
export function uniqueInvoiceNumber(prefix = 'E2E') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

/**
 * Fill the create-invoice form with sensible defaults. Caller can spread
 * overrides on top.
 */
export async function fillCreateInvoiceForm(
  page: Page,
  opts: {
    invoiceNumber: string;
    customerName?: string;
    customerEmail?: string;
    itemName?: string;
    quantity?: number;
    rate?: number;
    invoiceDate?: string; // yyyy-mm-dd
    dueDate?: string;
  },
) {
  // Fill native inputs by their `name` attribute (set by react-hook-form
  // via `register`). More resilient than label-text lookups against the
  // current i18n locale.
  await page.fill('input[name="customer.fullname"]', opts.customerName ?? 'E2E Customer');
  await page.fill('input[name="customer.email"]', opts.customerEmail ?? 'e2e@example.com');
  await page.fill('input[name="invoiceNumber"]', opts.invoiceNumber);
  await page.fill('input[name="invoiceDate"]', opts.invoiceDate ?? '2026-01-15');
  await page.fill('input[name="dueDate"]', opts.dueDate ?? '2026-02-15');
  await page.fill('input[name="item.name"]', opts.itemName ?? 'Consulting');
  await page.fill('input[name="item.quantity"]', String(opts.quantity ?? 2));
  await page.fill('input[name="item.rate"]', String(opts.rate ?? 250));
}
