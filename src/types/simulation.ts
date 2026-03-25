import type {
  Asset,
  Expense,
  FinanceStore,
  Frequency,
  Income,
  Liability,
} from './finance';

export type Mutation =
  | { type: 'add_asset'; asset: Asset }
  | { type: 'remove_asset'; assetId: string }
  | { type: 'adjust_asset_value'; assetId: string; delta: number }
  | { type: 'add_liability'; liability: Liability }
  | { type: 'remove_liability'; liabilityId: string }
  | { type: 'pay_off_loan'; liabilityId: string }
  | { type: 'add_income'; income: Income }
  | { type: 'remove_income'; incomeId: string }
  | { type: 'update_income'; incomeId: string; changes: Partial<Income> }
  | { type: 'add_expense'; expense: Expense }
  | { type: 'remove_expense'; expenseId: string }
  | { type: 'transfer'; fromAssetId: string; toAssetId: string; amount: number };

export type TimelineEvent = {
  id: string;
  label: string;
  icon: string;
  details: string[];
  mutations: Mutation[];
} & (
  | { schedule: 'once'; month: number }
  | {
      schedule: 'recurring';
      startMonth: number;
      endMonth: number | null;
      frequency: Frequency;
    }
);

export type SimulationAssumptions = {
  realEstateGrowth: number;
  etfCryptoGrowth: number;
  cashInterest: number;
};

export const DEFAULT_ASSUMPTIONS: SimulationAssumptions = {
  realEstateGrowth: 0.03,
  etfCryptoGrowth: 0.07,
  cashInterest: 0.02,
};

export type Scenario = {
  id: string;
  name: string;
  events: TimelineEvent[];
  assumptions: SimulationAssumptions;
};

export type MonthSummary = {
  month: number;
  netWorth: number;
  cashFlow: number;
  passiveIncome: number;
  totalIncome: number;
  totalExpenses: number;
  totalAssets: number;
  totalDebt: number;
  dti: number;
  maxBorrowable: number;
};

export type SimulationStep = {
  month: number;
  state: FinanceStore;
  summary: MonthSummary;
};

export type SimulationResult = {
  steps: SimulationStep[];
  fiMonth: number | null;
  totalInterestPaid: number;
};
