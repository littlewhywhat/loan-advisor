export type AmortizationRow = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remaining: number;
};

export function buildAmortizationSchedule(
  balance: number,
  annualRate: number,
  monthlyPayment: number,
): AmortizationRow[] {
  const rows: AmortizationRow[] = [];
  const r = annualRate / 12;
  let remaining = balance;

  for (let month = 1; remaining > 0.01; month++) {
    const interest = remaining * r;
    const principalPortion = Math.min(monthlyPayment - interest, remaining);
    remaining = Math.max(0, remaining - principalPortion);
    rows.push({
      month,
      payment: Math.round(principalPortion + interest),
      principal: Math.round(principalPortion),
      interest: Math.round(interest),
      remaining: Math.round(remaining),
    });
    if (month > 600) break;
  }

  return rows;
}
