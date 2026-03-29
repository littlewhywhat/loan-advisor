export type Currency = 'CZK' | 'EUR' | 'USD';

export type Frequency = 'monthly' | 'quarterly' | 'annually';

export type MoneyAmount = {
  amount: number;
  currency: Currency;
};

export type Income = {
  id: string;
  name: string;
  amount: MoneyAmount;
  frequency: Frequency;
};

export type Expense = {
  id: string;
  name: string;
  amount: MoneyAmount;
  frequency: Frequency;
};

type AssetBase = {
  id: string;
  name: string;
  value: MoneyAmount;
  growthRate: number;
};

export type Flat = AssetBase & { kind: 'flat' };
export type Cash = AssetBase & { kind: 'cash' };
export type Asset = Flat | Cash;

type LiabilityBase = {
  id: string;
  name: string;
  value: MoneyAmount;
  interestRate: number;
  startDate: string;
  endDate: string;
};

export type Loan = LiabilityBase & { kind: 'loan' };
export type Mortgage = LiabilityBase & {
  kind: 'mortgage';
  downPayment: MoneyAmount;
};
export type Liability = Loan | Mortgage;

export type EventStatus = 'active' | 'archived';

type EventBase = {
  id: string;
  date: string;
  status: EventStatus;
};

type TakeMortgageBase = EventBase & {
  type: 'take_mortgage';
  mortgage: Mortgage;
  flat: Flat;
  expense: Expense;
};

export type TakeMortgageEvent =
  | (TakeMortgageBase & { rental: false })
  | (TakeMortgageBase & { rental: true; income: Income });

export type TakePersonalLoanEvent = EventBase & {
  type: 'take_personal_loan';
  loan: Loan;
  cash: Cash;
  expense: Expense;
};

export type AddIncomeEvent = EventBase & {
  type: 'add_income';
  income: Income;
};

export type AddExpenseEvent = EventBase & {
  type: 'add_expense';
  expense: Expense;
};

export type ManualCorrectionEvent = EventBase & {
  type: 'manual_correction';
  changes: Record<string, unknown>;
};

export type FinanceEvent =
  | TakeMortgageEvent
  | TakePersonalLoanEvent
  | AddIncomeEvent
  | AddExpenseEvent
  | ManualCorrectionEvent;

export type EventStore = {
  events: FinanceEvent[];
};

export type DerivedState = {
  assets: Asset[];
  liabilities: Liability[];
  incomes: Income[];
  expenses: Expense[];
};
