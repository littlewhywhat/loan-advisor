export type Currency = 'CZK' | 'EUR';

export type Frequency = 'monthly' | 'quarterly' | 'annually';

export type AssetType = 'cash' | 'real_estate' | 'etf' | 'crypto';

export type RealEstateUsage = 'living' | 'leasing';

export type Asset = {
  id: string;
  name: string;
  type: AssetType;
  value: number;
  currency: Currency;
  yearlyGrowthRate: number | null;
  usage: RealEstateUsage | null;
  rentSavings: number | null;
  linkedIncomeIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type LiabilityType = 'loan' | 'recurring';

export type LoanType =
  | 'living_mortgage'
  | 'american_mortgage'
  | 'business'
  | 'personal';

type LiabilityBase = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Loan = LiabilityBase & {
  type: 'loan';
  loanType: LoanType;
  originalAmount: number;
  currentBalance: number;
  interestRate: number;
  monthlyPayment: number;
  startDate: string;
  endDate: string | null;
  linkedAssetId: string | null;
};

export type Recurring = LiabilityBase & {
  type: 'recurring';
  amount: number;
  frequency: Frequency;
  currency: string;
  linkedAssetId: string | null;
};

export type Liability = Loan | Recurring;

export type IncomeType = 'salary' | 'rental' | 'dividends';

export type Income = {
  id: string;
  name: string;
  type: IncomeType;
  amount: number;
  frequency: Frequency;
  isPassive: boolean;
  currency: string;
  linkedAssetId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseCategory = 'living_expense' | 'liability' | 'ownership';

export type Expense = {
  id: string;
  name: string;
  category: ExpenseCategory;
  amount: number;
  frequency: Frequency;
  isEssential: boolean;
  currency: string;
  linkedLiabilityId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FinanceStore = {
  currency: Currency;
  assets: Asset[];
  liabilities: Liability[];
  incomes: Income[];
  expenses: Expense[];
};

type EntityFields = 'id' | 'createdAt' | 'updatedAt';
type DistributiveOmit<T, K extends keyof never> = T extends unknown
  ? Omit<T, K>
  : never;
type DistributivePartial<T> = T extends unknown ? Partial<T> : never;

export type AssetInput = Omit<Asset, EntityFields>;
export type AssetUpdate = Partial<AssetInput>;

export type LiabilityInput = DistributiveOmit<Liability, EntityFields>;
export type LiabilityUpdate = DistributivePartial<LiabilityInput>;

export type IncomeInput = Omit<Income, EntityFields>;
export type IncomeUpdate = Partial<IncomeInput>;

export type ExpenseInput = Omit<Expense, EntityFields>;
export type ExpenseUpdate = Partial<ExpenseInput>;
