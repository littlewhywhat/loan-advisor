export const PRICE_PER_M2 = 120000; // CZK
export const RENT_PER_M2 = 400; // CZK
export const INTEREST_RATE = 0.05; // 5% annual interest
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
}

export interface CalculationResult {
  flatBudget: number;
  flatSize: number;
  loan: number;
  rentIncome: RentBreakdown;
  milestone: MilestoneMetrics;
}

export function computeResults(params: {
  monthlyRent: number;
  cash: number;
  years: number;
  loanTerm: number;
}): CalculationResult {
  const { monthlyRent, cash, years, loanTerm } = params;

  const loan = (monthlyRent * 12) / INTEREST_RATE;
  const flatBudget = loan + cash;
  const flatSize = flatBudget / PRICE_PER_M2;

  const rentIncomeGross = flatSize * RENT_PER_M2;
  const costs = rentIncomeGross * OPERATING_COST_RATE;
  const afterCost = rentIncomeGross - costs;
  const tax = afterCost * TAX_RATE;
  const rentIncomeNet = afterCost - tax;

  const totalInterest = loan * INTEREST_RATE * loanTerm;
  const paidInterest = (monthlyRent + rentIncomeNet) * 12 * years;
  const remainingInterest = Math.max(totalInterest - paidInterest, 0);
  const remainingYears = Math.max(loanTerm - years, 0);
  const monthlyInterestCost =
    remainingYears > 0 ? remainingInterest / (12 * remainingYears) : 0;
  const netToPrincipal =
    monthlyRent + rentIncomeNet - monthlyInterestCost;

  return {
    flatBudget,
    flatSize,
    loan,
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
    },
  };
}
