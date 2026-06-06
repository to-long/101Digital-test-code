import { pgTable, pgEnum, uuid, varchar, text, date, numeric, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const invoiceStatusEnum = pgEnum('invoice_status', ['Draft', 'Pending', 'Paid']);

export const invoices = pgTable('invoices', {
  invoiceId: uuid('invoice_id').primaryKey().defaultRandom(),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  invoiceReference: varchar('invoice_reference', { length: 255 }),
  invoiceDate: date('invoice_date').notNull(),
  dueDate: date('due_date').notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  currencySymbol: varchar('currency_symbol', { length: 5 }).notNull(),
  description: text('description'),
  status: invoiceStatusEnum('status').notNull().default('Draft'),

  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }).notNull(),
  customerMobileNumber: varchar('customer_mobile_number', { length: 50 }),
  customerAddress: text('customer_address'),

  invoiceSubTotal: numeric('invoice_sub_total', { precision: 15, scale: 2 }).notNull(),
  totalTax: numeric('total_tax', { precision: 15, scale: 2 }).notNull(),
  totalDiscount: numeric('total_discount', { precision: 15, scale: 2 }).notNull().default('0'),
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
  totalPaid: numeric('total_paid', { precision: 15, scale: 2 }).notNull().default('0'),
  balanceAmount: numeric('balance_amount', { precision: 15, scale: 2 }).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  // Soft-delete marker. NULL = active; non-null = removed (excluded from
  // list / detail queries). Preserves history for auditing.
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
