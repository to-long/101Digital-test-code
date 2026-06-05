export const CURRENCIES = ['AUD', 'USD', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  AUD: 'A$',
  USD: '$',
  GBP: '£',
};
