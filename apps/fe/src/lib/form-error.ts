/**
 * Maps the raw English Zod error messages (defined in
 * `packages/shared/src/validators/invoice.ts`) to i18n keys in the FE catalog.
 *
 * The shared schema can't import react-intl (it's used by the BE too), so we
 * keep the canonical English strings there and translate them at the
 * presentation layer via this lookup table.
 *
 * Add new entries here whenever a new Zod message is introduced upstream.
 */
const ERROR_KEY_MAP: Record<string, string> = {
  'Customer name is required': 'form.error.customerNameRequired',
  'Valid email is required': 'form.error.emailRequired',
  'Invoice number is required': 'form.error.invoiceNumberRequired',
  'Invoice date is required': 'form.error.invoiceDateRequired',
  'Due date is required': 'form.error.dueDateRequired',
  'Item name is required': 'form.error.itemNameRequired',
  'Quantity must be an integer': 'form.error.quantityInteger',
  'Quantity must be positive': 'form.error.quantityPositive',
  'Rate must be positive': 'form.error.ratePositive',
  'Tax cannot be negative': 'form.error.taxNegative',
  'Discount cannot be negative': 'form.error.discountNegative',
  'Due date must be on or after invoice date': 'form.error.dueAfterInvoice',
};

/** Look up the i18n key for a Zod error message. Returns null if unknown. */
export function errorMessageKey(message: string | undefined): string | null {
  if (!message) return null;
  return ERROR_KEY_MAP[message] ?? null;
}
