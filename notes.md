# Financial Strategy Interface — Design Plan

## Overview

Rich Dad Poor Dad–inspired personal financial dashboard with 4 pages:

1. **Dashboard** — Income Statement + Balance Sheet + net worth projection
2. **Assets Manager** — CRUD for assets (flats, ETFs, cash)
3. **Liabilities Manager** — CRUD for loans linked to assets
4. **Strategy Simulator** — Side-by-side projection of different financial strategies

Currency: EUR (configurable). All amounts monthly unless noted.

---

## Data Schema

### Enums / Unions

```ts
type Currency = "EUR" | "CZK";
type Owner = "personal" | "business";
type AssetType = "flat" | "etf" | "cash";
type LiabilityType = "mortgage" | "personal_loan" | "investment_loan";
type IncomeType = "salary" | "freelance" | "other";
type ExpenseCategory = "housing" | "living" | "transport" | "insurance" | "other";
```

### Asset (discriminated union on `type`)

```ts
type BaseAsset = {
  id: string;
  name: string;
  owner: Owner;
  currentValue: number;
  linkedLiabilityId?: string;
};

type FlatAsset = BaseAsset & {
  type: "flat";
  purchasePrice: number;
  monthlyRent: number;
  annualAppreciation: number;   // e.g. 0.03
  monthlyMaintenance: number;
  annualVacancyRate: number;    // e.g. 0.083 ≈ 1 month/year
};

type EtfAsset = BaseAsset & {
  type: "etf";
  annualReturn: number;         // total return (price + dividends) e.g. 0.08
  dividendYield: number;        // just the dividend portion e.g. 0.04
};

type CashAsset = BaseAsset & {
  type: "cash";
  interestRate: number;         // e.g. 0.03
};

type Asset = FlatAsset | EtfAsset | CashAsset;
```

### Liability

```ts
type Liability = {
  id: string;
  name: string;
  type: LiabilityType;
  owner: Owner;
  originalPrincipal: number;
  remainingPrincipal: number;
  annualRate: number;
  termYears: number;
  monthlyPayment: number;       // derived on save, cached for convenience
  startDate: string;            // ISO "2025-01"
  linkedAssetId?: string;
};
```

### Income (manual streams — asset-derived income is computed)

```ts
type IncomeStream = {
  id: string;
  name: string;
  type: IncomeType;
  monthlyAmount: number;
  owner: Owner;
};
```

### Expense (manual — liability payments are computed)

```ts
type Expense = {
  id: string;
  name: string;
  category: ExpenseCategory;
  monthlyAmount: number;
};
```

### Tax Config

```ts
type TaxConfig = {
  personalIncomeTaxRate: number;    // e.g. 0.25
  businessTaxRate: number;          // e.g. 0.21
  dividendTaxRate: number;          // e.g. 0.15
  capitalGainsTaxRate: number;      // e.g. 0.19
  rentalDeductionRate: number;      // simplified flat deduction e.g. 0.30
  businessInterestDeductible: boolean;
};
```

### Settings

```ts
type Settings = {
  currency: Currency;
  tax: TaxConfig;
};
```

### Strategy (for Simulator)

Each strategy is a self-contained financial snapshot that can be projected forward.

```ts
type Strategy = {
  id: string;
  name: string;
  assets: Asset[];
  liabilities: Liability[];
  incomes: IncomeStream[];
  expenses: Expense[];
  reinvestmentAssetId?: string;    // surplus cash flow goes into this asset
  projectionYears: number;
};
```

---

## Storage

Single localStorage key: `"financial-strategy"`

```ts
type FinancialState = {
  settings: Settings;
  assets: Asset[];
  liabilities: Liability[];
  incomes: IncomeStream[];
  expenses: Expense[];
  strategies: Strategy[];
};
```

### Default State

```ts
const DEFAULT_TAX: TaxConfig = {
  personalIncomeTaxRate: 0.25,
  businessTaxRate: 0.21,
  dividendTaxRate: 0.15,
  capitalGainsTaxRate: 0.19,
  rentalDeductionRate: 0.30,
  businessInterestDeductible: true,
};

const DEFAULT_SETTINGS: Settings = {
  currency: "EUR",
  tax: DEFAULT_TAX,
};

const DEFAULT_STATE: FinancialState = {
  settings: DEFAULT_SETTINGS,
  assets: [],
  liabilities: [],
  incomes: [],
  expenses: [],
  strategies: [],
};
```

### Hook API — `useFinancialStore()`

```ts
function useFinancialStore(): {
  state: FinancialState;

  // Assets
  addAsset(asset: Omit<Asset, "id">): string;
  updateAsset(id: string, patch: Partial<Asset>): void;
  removeAsset(id: string): void;

  // Liabilities
  addLiability(liability: Omit<Liability, "id">): string;
  updateLiability(id: string, patch: Partial<Liability>): void;
  removeLiability(id: string): void;

  // Incomes
  addIncome(income: Omit<IncomeStream, "id">): string;
  updateIncome(id: string, patch: Partial<IncomeStream>): void;
  removeIncome(id: string): void;

  // Expenses
  addExpense(expense: Omit<Expense, "id">): string;
  updateExpense(id: string, patch: Partial<Expense>): void;
  removeExpense(id: string): void;

  // Strategies
  addStrategy(strategy: Omit<Strategy, "id">): string;
  updateStrategy(id: string, patch: Partial<Strategy>): void;
  removeStrategy(id: string): void;
  createStrategyFromCurrent(name: string): string;

  // Settings
  updateSettings(patch: Partial<Settings>): void;
  updateTax(patch: Partial<TaxConfig>): void;
};
```

---

## Calculation Functions

### `src/lib/calc/tax.ts`

```ts
function taxOnRentalIncome(
  grossRent: number,
  maintenance: number,
  loanInterest: number,
  owner: Owner,
  tax: TaxConfig,
): number;

function taxOnDividends(
  grossDividends: number,
  tax: TaxConfig,
): number;

function deductibleInterest(
  monthlyInterest: number,
  owner: Owner,
  tax: TaxConfig,
): number;
```

### `src/lib/calc/asset.ts`

```ts
function assetMonthlyIncome(asset: Asset, tax: TaxConfig): number;
function assetAnnualAppreciation(asset: Asset): number;
```

### `src/lib/calc/liability.ts`

Reuses existing `monthlyPayment()` from `loanCalc.ts`.

```ts
function computeMonthlyPayment(principal: number, annualRate: number, termYears: number): number;
function remainingPrincipalAfter(original: number, annualRate: number, termYears: number, monthsElapsed: number): number;
function monthlyInterestPortion(remainingPrincipal: number, annualRate: number): number;
function amortizationSchedule(liability: Liability): Array<{
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}>;
```

### `src/lib/calc/statements.ts`

```ts
type IncomeStatement = {
  incomeManual: number;
  incomeFromAssets: number;
  incomeTotal: number;
  expensesManual: number;
  expensesDebtService: number;
  expensesTotal: number;
  taxTotal: number;
  cashFlow: number;
};

type BalanceSheet = {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  debtToAssetRatio: number;
  assets: Array<{ id: string; name: string; value: number }>;
  liabilities: Array<{ id: string; name: string; value: number }>;
};

function computeIncomeStatement(state: FinancialState): IncomeStatement;
function computeBalanceSheet(state: FinancialState): BalanceSheet;
```

### `src/lib/calc/simulator.ts`

```ts
type MonthSnapshot = {
  month: number;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyCashFlow: number;
  passiveIncome: number;
  debtService: number;
};

function simulateStrategy(
  strategy: Strategy,
  taxConfig: TaxConfig,
): MonthSnapshot[];
```

Simulation loop (per month):
1. Compute income: manual incomes + asset income (rent after vacancy/maintenance/tax, dividends after tax)
2. Compute expenses: manual expenses + liability monthly payments
3. Cash flow = income − expenses
4. If cash flow > 0 and reinvestmentAssetId set → increase that asset's value
5. Update each asset value (appreciation)
6. Update each liability (reduce principal by amortized amount)
7. If a liability's remaining principal ≤ 0 → mark as paid off, no more payments
8. Record snapshot

---

## Pages

### 1. Dashboard (`/`)

**Uses:** `computeIncomeStatement()`, `computeBalanceSheet()`, whole `state`

- Income Statement card (income breakdown → expenses breakdown → cash flow)
- Balance Sheet card (assets pie/bar → liabilities pie/bar → net worth)
- Key metrics: monthly cash flow, debt-to-asset ratio, passive income coverage ratio
- Simple net worth projection chart (12-month forward using current cash flow)

### 2. Assets Manager (`/assets`)

**Uses:** `addAsset`, `updateAsset`, `removeAsset`, `assetMonthlyIncome()`

- List of asset cards, grouped by type or owner
- Each card shows: name, value, monthly income, annual return %, linked loan
- Add asset form: type selector → fields change per type (flat fields vs ETF fields vs cash fields)
- Edit inline
- Delete with confirmation

### 3. Liabilities Manager (`/liabilities`)

**Uses:** `addLiability`, `updateLiability`, `removeLiability`, `amortizationSchedule()`

- List of liability cards
- Each card: name, remaining balance, monthly payment, rate, term, linked asset
- Amortization = expandable table showing month-by-month split of payment into principal vs interest and remaining balance (answers "how much do I still owe in month X")
- Add / edit / delete

### 4. Strategy Simulator (`/simulator`)

**Uses:** `strategies`, `createStrategyFromCurrent()`, `simulateStrategy()`

- "Import current state" button → creates a strategy pre-filled with actual data
- Two strategy slots side by side, each editable (can modify assets/liabilities/incomes/expenses within the strategy)
- Projection charts (Recharts):
  - Net worth over time (two lines)
  - Monthly cash flow over time (two lines)
  - Passive income vs expenses (when does passive income cross expenses?)
- Comparison table: net worth at year 5/10/15/20, FI date, total interest paid, risk score
- Adjustable projection horizon slider (5–30 years)

---

## File Structure

```
src/
├── lib/
│   ├── types.ts                  # all types from this doc
│   ├── store.ts                  # useFinancialStore hook + localStorage
│   ├── format.ts                 # formatEUR(), formatDuration(), formatPct()
│   ├── calc/
│   │   ├── tax.ts
│   │   ├── asset.ts
│   │   ├── liability.ts
│   │   ├── statements.ts
│   │   └── simulator.ts
│   ├── loanCalc.ts               # existing — keep, reuse monthlyPayment()
│   └── expenseCalc.ts            # existing — keep for legacy page
├── routes/
│   ├── HomePage.tsx              # existing expense→investment page (keep as /legacy or /expense-calc)
│   ├── DashboardPage.tsx         # new
│   ├── AssetsPage.tsx            # new
│   ├── LiabilitiesPage.tsx       # new
│   └── SimulatorPage.tsx         # new
├── components/
│   └── ...                       # shared UI components as needed
├── hooks/
│   └── useCalculations.ts        # existing — keep for legacy page
└── App.tsx                       # add routes + navigation
```

---

## Branch Plan

### Phase 1: Shared foundation (current branch → merge to main)
- `src/lib/types.ts`
- `src/lib/store.ts` (hook + localStorage)
- `src/lib/format.ts`
- `src/lib/calc/*` (all calculation functions)
- `src/App.tsx` (add routes + nav shell)

### Phase 2: 4 parallel branches
- `feature/dashboard` → `DashboardPage.tsx`
- `feature/assets` → `AssetsPage.tsx`
- `feature/liabilities` → `LiabilitiesPage.tsx`
- `feature/simulator` → `SimulatorPage.tsx`
