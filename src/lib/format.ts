import type { Currency, Frequency, MoneyAmount } from '@/types/events';
import type {
  Currency as LegacyCurrency,
  Frequency as LegacyFrequency,
} from '@/types/finance';

type AnyCurrency = Currency | LegacyCurrency;
type AnyFrequency = Frequency | LegacyFrequency;

const FORMATTERS: Record<string, Intl.NumberFormat> = {
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
  USD: new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }),
};

export function formatMoney(
  amount: number,
  currency: AnyCurrency = 'CZK',
): string {
  return (FORMATTERS[currency] ?? FORMATTERS.CZK).format(amount);
}

export function fmtMoney(m: MoneyAmount): string {
  return formatMoney(m.amount, m.currency);
}

export function toMonthly(amount: number, frequency: AnyFrequency): number {
  if (frequency === 'monthly') return amount;
  if (frequency === 'quarterly') return amount / 3;
  return amount / 12;
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
