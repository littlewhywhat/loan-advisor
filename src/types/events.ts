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
  createdAt?: string;
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

export type AddAssetEvent = EventBase & {
  type: 'add_asset';
  asset: Asset;
};

export type AddExpenseEvent = EventBase & {
  type: 'add_expense';
  expense: Expense;
};

export type ManualCorrectionEvent = EventBase & {
  type: 'manual_correction';
  changes: Record<string, unknown>;
};

export type RepayLoanStrategy = 'reduce_payment' | 'reduce_term';

export type RepayLoanEvent = EventBase & {
  type: 'repay_loan';
  liabilityId: string;
  expenseId: string;
  repaymentAmount: MoneyAmount;
  strategy: RepayLoanStrategy;
  newPrincipal: MoneyAmount;
  newStartDate: string;
  newEndDate: string;
  newMonthlyPayment: MoneyAmount;
};

export type FinanceEvent =
  | TakeMortgageEvent
  | TakePersonalLoanEvent
  | AddAssetEvent
  | AddIncomeEvent
  | AddExpenseEvent
  | ManualCorrectionEvent
  | RepayLoanEvent;

type DistributiveOmit<T, K extends keyof never> = T extends unknown
  ? Omit<T, K>
  : never;

export type NewEventInput = DistributiveOmit<FinanceEvent, 'id' | 'status'>;

export type EventStore = {
  events: FinanceEvent[];
};

export type Strategy = {
  name: string;
  events: NewEventInput[];
};

export type DerivedState = {
  assets: Asset[];
  liabilities: Liability[];
  incomes: Income[];
  expenses: Expense[];
};
