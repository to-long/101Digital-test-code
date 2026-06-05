import { z } from 'zod';
import { CURRENCIES } from '../constants/currencies';

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
    taxPercent: z.number().min(0, 'Tax cannot be negative').default(10),
    discount: z.number().min(0, 'Discount cannot be negative').default(0),
  })
  .refine((data) => new Date(data.dueDate) >= new Date(data.invoiceDate), {
    message: 'Due date must be on or after invoice date',
    path: ['dueDate'],
  });

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
