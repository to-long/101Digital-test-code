export const INVOICE_DB_STATUSES = ['Draft', 'Pending', 'Paid'] as const;
export type InvoiceDbStatus = (typeof INVOICE_DB_STATUSES)[number];

export const INVOICE_DISPLAY_STATUSES = ['Draft', 'Pending', 'Paid', 'Overdue', 'Deleted'] as const;
export type InvoiceDisplayStatus = (typeof INVOICE_DISPLAY_STATUSES)[number];
