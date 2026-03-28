import type { Loan } from '@/types/finance';

export function monthlyPayment(
  principal: number,
  annualRate: number,
  years: number,
): number {
  const n = years * 12;
  const r = annualRate / 12;
  if (r === 0) return principal / n;
  return (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1);
}

export function monthlyPaymentFromMonths(
  principal: number,
  annualRate: number,
  totalMonths: number,
): number {
  if (totalMonths <= 0 || principal <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return principal / totalMonths;
  return (
    (principal * r * (1 + r) ** totalMonths) / ((1 + r) ** totalMonths - 1)
  );
}

export function monthsBetween(startDate: string, endDate: string): number {
  const s = new Date(startDate);
  const e = new Date(endDate);
  return (
    (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
  );
}

export function elapsedMonths(startDate: string): number {
  const s = new Date(startDate);
  const n = new Date();
  const months =
    (n.getFullYear() - s.getFullYear()) * 12 + (n.getMonth() - s.getMonth());
  return Math.max(0, months);
}

export function remainingBalance(
  principal: number,
  annualRate: number,
  payment: number,
  elapsedN: number,
): number {
  if (elapsedN <= 0) return principal;
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return Math.max(0, principal - payment * elapsedN);
  const balance =
    principal * (1 + r) ** elapsedN - (payment * ((1 + r) ** elapsedN - 1)) / r;
  return Math.max(0, Math.round(balance));
}

export function computeLoanDerived(
  originalAmount: number,
  annualRate: number,
  startDate: string,
  endDate: string,
): { monthlyPayment: number; currentBalance: number } {
  const total = monthsBetween(startDate, endDate);
  const mp = monthlyPaymentFromMonths(originalAmount, annualRate, total);
  const elapsed = elapsedMonths(startDate);
  const cb = remainingBalance(originalAmount, annualRate, mp, elapsed);
  return { monthlyPayment: Math.round(mp), currentBalance: cb };
}

export function liveBalance(loan: Loan): number {
  const elapsed = elapsedMonths(loan.startDate);
  return remainingBalance(
    loan.originalAmount,
    loan.interestRate,
    loan.monthlyPayment,
    elapsed,
  );
}

const TERM_MONTHS: Record<string, number> = {
  'Personal 8yr': 96,
  'Mortgage 25yr': 300,
  'Mortgage 30yr': 360,
};

export type LoanBreakdown = {
  label: string;
  monthlyPayment: number;
  totalPaid: number;
  principal: number;
  interest: number;
  principalPct: number;
  interestPct: number;
};

export function sampleLoanPayments(principal: number): LoanBreakdown[] {
  return [
    {
      label: 'Personal 8yr',
      monthlyPayment: monthlyPayment(principal, 0.12, 8),
      principal,
    },
    {
      label: 'Mortgage 25yr',
      monthlyPayment: monthlyPayment(principal, 0.06, 25),
      principal,
    },
    {
      label: 'Mortgage 30yr',
      monthlyPayment: monthlyPayment(principal, 0.06, 30),
      principal,
    },
  ].map((loan) => {
    const totalPaid = Math.round(loan.monthlyPayment * TERM_MONTHS[loan.label]);
    const interest = totalPaid - principal;
    return {
      label: loan.label,
      monthlyPayment: Math.round(loan.monthlyPayment),
      totalPaid,
      principal,
      interest,
      principalPct: Math.round((principal / totalPaid) * 100),
      interestPct: Math.round((interest / totalPaid) * 100),
    };
  });
}
