export const PRICE_PER_M2 = 120000; // CZK
export const RENT_PER_M2 = 400; // CZK
export const DEFAULT_INTEREST_RATE = 0.05; // 5% annual interest
export const OPERATING_COST_RATE = 0.25;
export const TAX_RATE = 0.15;

export interface RentBreakdown {
  gross: number;
  costs: number;
  tax: number;
  net: number;
}

export interface MilestoneMetrics {
  paidInterest: number;
  totalInterest: number;
  remainingYears: number;
  monthlyInterestCost: number;
  netToPrincipal: number;
  expenseDuringPeriod: number;
  expenseAfterPeriod: number;
}

export interface CalculationResult {
  flatBudget: number;
  flatSize: number;
  loan: number;
  monthlyPayment: number;
  rentIncome: RentBreakdown;
  milestone: MilestoneMetrics;
}

export function computeResults(params: {
  monthlyRent: number;
  cash: number;
  monthlySavings: number;
  years: number;
  loanTerm: number;
  interestRate: number;
}): CalculationResult {
  const { monthlyRent, cash, monthlySavings, years, loanTerm, interestRate } =
    params;

  const monthlyRate = interestRate / 12;
  const rateFactor = monthlyRate
    ? monthlyRate / (1 - Math.pow(1 + monthlyRate, -loanTerm * 12))
    : 1 / (loanTerm * 12);
  const netRentPerM2 = RENT_PER_M2 * (1 - OPERATING_COST_RATE) * (1 - TAX_RATE);
  const alpha = netRentPerM2 / PRICE_PER_M2;
  const denominator = rateFactor - alpha;
  const loan =
    denominator > 0 ? (monthlySavings + alpha * cash) / denominator : 0;

  const flatBudget = loan + cash;
  const flatSize = flatBudget / PRICE_PER_M2;

  const rentIncomeGross = flatSize * RENT_PER_M2;
  const costs = rentIncomeGross * OPERATING_COST_RATE;
  const afterCost = rentIncomeGross - costs;
  const tax = afterCost * TAX_RATE;
  const rentIncomeNet = afterCost - tax;
  const monthlyPayment = loan * rateFactor;
  const expenseDuringPeriod = monthlyPayment + monthlyRent - rentIncomeNet;
  const totalInterest = monthlyPayment * loanTerm * 12 - loan;
  const paidInterest = Math.min(expenseDuringPeriod * 12 * years, totalInterest);
  const remainingInterest = Math.max(totalInterest - paidInterest, 0);
  const remainingYears = Math.max(loanTerm - years, 0);
  const monthlyInterestCost =
    remainingYears > 0 ? remainingInterest / (12 * remainingYears) : 0;
  const netToPrincipal = monthlyPayment - monthlyInterestCost;
  const expenseAfterPeriod = monthlyRent - rentIncomeNet + monthlyInterestCost;

  return {
    flatBudget,
    flatSize,
    loan,
    monthlyPayment,
    rentIncome: {
      gross: rentIncomeGross,
      costs,
      tax,
      net: rentIncomeNet,
    },
    milestone: {
      paidInterest,
      totalInterest,
      remainingYears,
      monthlyInterestCost,
      netToPrincipal,
      expenseDuringPeriod,
      expenseAfterPeriod,
    },
  };
}
