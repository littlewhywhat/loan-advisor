import type { Currency, Frequency } from '@/types/finance';

const FORMATTERS: Record<Currency, Intl.NumberFormat> = {
  CZK: new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }),
  EUR: new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }),
};

export function formatMoney(
  amount: number,
  currency: Currency = 'CZK',
): string {
  return FORMATTERS[currency].format(amount);
}

export function toMonthly(amount: number, frequency: Frequency): number {
  if (frequency === 'monthly') return amount;
  if (frequency === 'quarterly') return amount / 3;
  return amount / 12;
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
