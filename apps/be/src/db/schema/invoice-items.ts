import { pgTable, uuid, varchar, integer, numeric } from 'drizzle-orm/pg-core';
import { invoices } from './invoices';

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoices.invoiceId, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  rate: numeric('rate', { precision: 15, scale: 2 }).notNull(),
});
