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
