import { z } from 'zod';
import { CURRENCIES } from '../constants/currencies';
import { INVOICE_DB_STATUSES } from '../constants/status';

export const createInvoiceSchema = z
  .object({
    customer: z.object({
      fullname: z.string().min(1, 'Customer name is required'),
      email: z.string().email('Valid email is required'),
      mobileNumber: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
    }),
    invoiceNumber: z.string().min(1, 'Invoice number is required'),
    invoiceReference: z.string().optional().nullable(),
    invoiceDate: z.string().min(1, 'Invoice date is required'),
    dueDate: z.string().min(1, 'Due date is required'),
    currency: z.enum(CURRENCIES),
    description: z.string().optional().nullable(),
    item: z.object({
      name: z.string().min(1, 'Item name is required'),
      quantity: z.number().int('Quantity must be an integer').positive('Quantity must be positive'),
      rate: z.number().positive('Rate must be positive'),
    }),
    taxPercent: z.number().min(0, 'Tax cannot be negative'),
    discount: z.number().min(0, 'Discount cannot be negative'),
  })
  .refine((data) => new Date(data.dueDate) >= new Date(data.invoiceDate), {
    message: 'Due date must be on or after invoice date',
    path: ['dueDate'],
  });

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = z
  .object({
    customer: z.object({
      fullname: z.string().min(1, 'Customer name is required'),
      email: z.string().email('Valid email is required'),
      mobileNumber: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
    }),
    invoiceDate: z.string().min(1, 'Invoice date is required'),
    dueDate: z.string().min(1, 'Due date is required'),
    currency: z.enum(CURRENCIES),
    description: z.string().optional().nullable(),
    status: z.enum(INVOICE_DB_STATUSES),
    item: z.object({
      name: z.string().min(1, 'Item name is required'),
      quantity: z.number().int('Quantity must be an integer').positive('Quantity must be positive'),
      rate: z.number().positive('Rate must be positive'),
    }),
    taxPercent: z.number().min(0, 'Tax cannot be negative'),
    discount: z.number().min(0, 'Discount cannot be negative'),
  })
  .refine((data) => new Date(data.dueDate) >= new Date(data.invoiceDate), {
    message: 'Due date must be on or after invoice date',
    path: ['dueDate'],
  });

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
