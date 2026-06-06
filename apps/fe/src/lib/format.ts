import { format, parseISO } from 'date-fns';

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM dd, yyyy');
}

export function formatCurrency(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
