import type { Currency } from '../constants/currencies';
import type { InvoiceDisplayStatus } from '../constants/status';

export interface Customer {
  fullname: string;
  email: string;
  mobileNumber?: string | null;
  address?: string | null;
}

export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
}

export interface Invoice {
  invoiceId: string;
  invoiceNumber: string;
  invoiceReference?: string | null;
  invoiceDate: string;
  dueDate: string;
  currency: Currency;
  currencySymbol: string;
  description?: string | null;
  status: InvoiceDisplayStatus;
  customer: Customer;
  items: InvoiceItem[];
  invoiceSubTotal: number;
  totalTax: number;
  totalDiscount: number;
  totalAmount: number;
  totalPaid: number;
  balanceAmount: number;
  createdAt: string;
}

export interface CreateInvoiceRequest {
  customer: {
    fullname: string;
    email: string;
    mobileNumber?: string | null;
    address?: string | null;
  };
  invoiceNumber: string;
  invoiceReference?: string | null;
  invoiceDate: string;
  dueDate: string;
  currency: Currency;
  description?: string | null;
  item: {
    name: string;
    quantity: number;
    rate: number;
  };
  taxPercent: number;
  discount: number;
}
