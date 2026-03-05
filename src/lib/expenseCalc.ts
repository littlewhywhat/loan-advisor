export type ExpenseLoanInputs = {
  monthlyExpense: number;
  monthlySavings: number;
  yearlyReturn: number;
  taxRate: number;
  loanAnnualRate: number;
  loanYears: number;
};

export type ExpenseLoanResult = {
  monthlyNetReturn: number;
  coveredExpense: number;
  isFullyCovered: boolean;
  additionalSavingsNeeded: number;
  loanPrincipal: number;
  monthlyLoanPayment: number;
  totalInterest: number;
  breakEvenMonths: number;
  savingsOnlyMonths: number;
  timeSavedYears: number;
  postLoanMonthlyIncome: number;
  dividendSurplus: number;
  dividendSurplusYearly: number;
};

function annuityFactor(monthlyRate: number, months: number): number {
  if (monthlyRate === 0) return months;
  return (1 - (1 + monthlyRate) ** -months) / monthlyRate;
}

function savingsOnlyMonths(
  monthlySavings: number,
  monthlyReturn: number,
  target: number,
): number {
  if (monthlySavings <= 0) return Number.POSITIVE_INFINITY;
  let balance = 0;
  let months = 0;
  const maxMonths = 12 * 100;
  while (balance < target && months < maxMonths) {
    balance += monthlySavings;
    balance *= 1 + monthlyReturn;
    months++;
  }
  return months;
}

export function computeExpenseLoan(
  inputs: ExpenseLoanInputs,
): ExpenseLoanResult {
  const {
    monthlyExpense,
    monthlySavings,
    yearlyReturn,
    taxRate,
    loanAnnualRate,
    loanYears,
  } = inputs;

  const rawMonthlyReturn = (yearlyReturn * (1 - taxRate)) / 12;
  const monthlyNetReturn = Math.floor(rawMonthlyReturn * 10000) / 10000;
  const r = loanAnnualRate / 12;
  const n = loanYears * 12;
  const factor = annuityFactor(r, n);
  const fd = factor * monthlyNetReturn;

  let coveredExpense: number;
  let isFullyCovered: boolean;
  let additionalSavingsNeeded: number;

  if (fd >= 1) {
    coveredExpense = monthlyExpense;
    isFullyCovered = true;
    additionalSavingsNeeded = 0;
  } else {
    const unclamped = (monthlySavings * fd) / (1 - fd);
    if (unclamped >= monthlyExpense) {
      coveredExpense = monthlyExpense;
      isFullyCovered = true;
      additionalSavingsNeeded = 0;
    } else {
      coveredExpense = unclamped;
      isFullyCovered = false;
      const requiredSavings = (monthlyExpense * (1 - fd)) / fd;
      additionalSavingsNeeded = requiredSavings - monthlySavings;
    }
  }

  const monthlyLoanPayment = monthlySavings + coveredExpense;
  const loanPrincipal = monthlyLoanPayment * factor;
  const totalPaid = monthlyLoanPayment * n;
  const totalInterest = totalPaid - loanPrincipal;

  const breakEvenMonths =
    coveredExpense > 0
      ? Math.ceil(totalInterest / coveredExpense)
      : Number.POSITIVE_INFINITY;

  const soMonths = savingsOnlyMonths(
    monthlySavings,
    monthlyNetReturn,
    loanPrincipal,
  );

  const timeSavedYears = (soMonths - n) / 12;

  const postLoanMonthlyIncome = loanPrincipal * monthlyNetReturn;
  const dividendSurplus = Math.max(0, postLoanMonthlyIncome - monthlyExpense);
  const dividendSurplusYearly = dividendSurplus * 12;

  return {
    monthlyNetReturn,
    coveredExpense,
    isFullyCovered,
    additionalSavingsNeeded,
    loanPrincipal,
    monthlyLoanPayment,
    totalInterest,
    breakEvenMonths,
    savingsOnlyMonths: soMonths,
    timeSavedYears,
    postLoanMonthlyIncome,
    dividendSurplus,
    dividendSurplusYearly,
  };
}
