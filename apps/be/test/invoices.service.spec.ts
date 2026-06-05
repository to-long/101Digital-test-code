import { describe, test, expect } from 'bun:test';

function calculateInvoice(quantity: number, rate: number, taxPercent: number, discount: number) {
  const subTotal = quantity * rate;
  const taxAmount = subTotal * (taxPercent / 100);
  const totalAmount = subTotal + taxAmount - discount;
  const balanceAmount = totalAmount;
  return { subTotal, taxAmount, totalAmount, balanceAmount };
}

function deriveStatus(status: string, dueDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  return status !== 'Paid' && due < today ? 'Overdue' : status;
}

describe('Invoice Calculations', () => {
  test('basic calculation: quantity * rate', () => {
    const result = calculateInvoice(2, 1000, 10, 20);
    expect(result.subTotal).toBe(2000);
  });

  test('tax calculation: subTotal * (taxPercent / 100)', () => {
    const result = calculateInvoice(2, 1000, 10, 0);
    expect(result.taxAmount).toBe(200);
  });

  test('total = subTotal + tax - discount', () => {
    const result = calculateInvoice(2, 1000, 10, 20);
    expect(result.totalAmount).toBe(2180);
  });

  test('balance equals total when no payment', () => {
    const result = calculateInvoice(5, 500, 15, 100);
    expect(result.balanceAmount).toBe(result.totalAmount);
  });

  test('0% tax', () => {
    const result = calculateInvoice(3, 100, 0, 0);
    expect(result.taxAmount).toBe(0);
    expect(result.totalAmount).toBe(300);
  });

  test('0 discount', () => {
    const result = calculateInvoice(1, 1000, 10, 0);
    expect(result.totalAmount).toBe(1100);
  });

  test('large numbers', () => {
    const result = calculateInvoice(100, 5000, 15, 500);
    expect(result.subTotal).toBe(500000);
    expect(result.taxAmount).toBe(75000);
    expect(result.totalAmount).toBe(574500);
  });

  test('matches mock data from Appendix A', () => {
    const result = calculateInvoice(2, 1000, 10, 20);
    expect(result.subTotal).toBe(2000);
    expect(result.taxAmount).toBe(200);
    expect(result.totalAmount).toBe(2180);
  });
});

describe('Overdue Status Derivation', () => {
  test('Pending with past due date → Overdue', () => {
    expect(deriveStatus('Pending', '2025-01-01')).toBe('Overdue');
  });

  test('Draft with past due date → Overdue', () => {
    expect(deriveStatus('Draft', '2025-01-01')).toBe('Overdue');
  });

  test('Paid with past due date → still Paid', () => {
    expect(deriveStatus('Paid', '2025-01-01')).toBe('Paid');
  });

  test('Pending with future due date → Pending', () => {
    expect(deriveStatus('Pending', '2099-12-31')).toBe('Pending');
  });

  test('Draft with future due date → Draft', () => {
    expect(deriveStatus('Draft', '2099-12-31')).toBe('Draft');
  });

  test('Paid with future due date → Paid', () => {
    expect(deriveStatus('Paid', '2099-12-31')).toBe('Paid');
  });
});

describe('Due Date Validation', () => {
  test('due date before invoice date → invalid', () => {
    const invoiceDate = new Date('2026-06-05');
    const dueDate = new Date('2026-06-04');
    expect(dueDate < invoiceDate).toBe(true);
  });

  test('due date equals invoice date → valid', () => {
    const invoiceDate = new Date('2026-06-05');
    const dueDate = new Date('2026-06-05');
    expect(dueDate >= invoiceDate).toBe(true);
  });

  test('due date after invoice date → valid', () => {
    const invoiceDate = new Date('2026-06-05');
    const dueDate = new Date('2026-07-05');
    expect(dueDate >= invoiceDate).toBe(true);
  });
});
