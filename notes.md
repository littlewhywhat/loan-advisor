# Personal Finance Storage Design

## Overview

Extend the loan advisor into a personal finance dashboard. Storage uses `localStorage` with a single JSON object. Existing loan calculator storage (`loan-advisor-calculations`) remains untouched — the new finance data lives under a separate key.

**Storage key:** `personal-finance`

**Top-level shape:**

```ts
type FinanceStore = {
  version: 1
  currency: string               // default display currency, e.g. "CZK"
  assets: Asset[]
  liabilities: Liability[]
  incomes: Income[]
  expenses: Expense[]
  snapshots: NetWorthSnapshot[]   // historical net worth tracking
}
```

---

## Entities

### Asset

Something you own that has monetary value.

```ts
type AssetType =
  | 'cash'
  | 'savings_account'
  | 'real_estate'
  | 'vehicle'
  | 'stock'
  | 'bond'
  | 'etf'
  | 'crypto'
  | 'retirement'
  | 'business'
  | 'other'

type Asset = {
  id: string
  name: string
  type: AssetType
  value: number                   // current estimated value
  currency: string
  linkedIncomeIds: string[]       // income streams this asset generates (dividends, rent, etc.)
  createdAt: string               // ISO 8601
  updatedAt: string
}
```

**Examples:** apartment (real_estate, 5M CZK), emergency fund (savings_account, 200k CZK), VWCE (etf, 300k CZK), car (vehicle, 150k CZK).

---

### Liability

Something you owe — a debt or financial obligation.

```ts
type LiabilityType =
  | 'mortgage'
  | 'car_loan'
  | 'student_loan'
  | 'personal_loan'
  | 'credit_card'
  | 'other'

type Liability = {
  id: string
  name: string
  type: LiabilityType
  originalAmount: number          // how much was borrowed
  currentBalance: number          // remaining principal
  interestRate: number            // annual, as decimal (0.05 = 5%)
  monthlyPayment: number          // fixed monthly installment
  startDate: string               // ISO 8601 date
  endDate: string | null          // expected payoff date, null for revolving (credit card)
  currency: string
  linkedAssetId: string | null    // optional: the asset this debt financed (mortgage → apartment)
  createdAt: string
  updatedAt: string
}
```

**Examples:** mortgage (4.5%, 25yr, 3.2M CZK), car loan (6%, 5yr, 400k CZK), credit card balance (revolving, 15k CZK).

---

### Income

A source of money coming in, recurring or one-time.

```ts
type IncomeType =
  | 'salary'
  | 'freelance'
  | 'business'
  | 'rental'
  | 'dividends'
  | 'interest'
  | 'pension'
  | 'side_hustle'
  | 'other'

type Frequency =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'semiannually'
  | 'annually'

type Income = {
  id: string
  name: string
  type: IncomeType
  amount: number                  // per occurrence (gross)
  netAmount: number               // after tax / deductions
  frequency: Frequency
  isPassive: boolean              // true = doesn't require active work
  currency: string
  linkedAssetId: string | null    // which asset generates this (etf → dividends, apartment → rent)
  createdAt: string
  updatedAt: string
}
```

**Examples:** main job salary (monthly, 80k CZK gross / 62k net, active), apartment rent income (monthly, 15k CZK, passive, linked to real_estate asset), ETF dividends (quarterly, 3k CZK, passive, linked to etf asset).

---

### Expense

A recurring cost or financial commitment.

```ts
type ExpenseCategory =
  | 'housing'
  | 'utilities'
  | 'transportation'
  | 'food'
  | 'insurance'
  | 'healthcare'
  | 'subscriptions'
  | 'education'
  | 'entertainment'
  | 'clothing'
  | 'personal'
  | 'giving'
  | 'other'

type Expense = {
  id: string
  name: string
  category: ExpenseCategory
  amount: number
  frequency: Frequency
  isEssential: boolean            // true = rent, food, insurance; false = netflix, dining out
  currency: string
  linkedLiabilityId: string | null  // optional: ties to a liability (mortgage payment → mortgage)
  createdAt: string
  updatedAt: string
}
```

**Examples:** rent (housing, 18k/mo, essential), groceries (food, 8k/mo, essential), Netflix (subscriptions, 300/mo, non-essential), mortgage payment (housing, 14k/mo, essential, linked to mortgage liability).

---

### NetWorthSnapshot

Periodic snapshot for tracking net worth over time. Auto-generated on data changes (debounced, max once per day).

```ts
type NetWorthSnapshot = {
  id: string
  date: string                    // ISO 8601 date (YYYY-MM-DD)
  totalAssets: number
  totalLiabilities: number
  netWorth: number                // totalAssets - totalLiabilities
  totalMonthlyIncome: number      // all income normalized to monthly
  totalMonthlyExpenses: number    // all expenses normalized to monthly
  monthlyCashFlow: number         // income - expenses
  passiveIncomeRatio: number      // passive income / total expenses (0..1+)
}
```

---

## Derived Calculations (not stored, computed on read)

| Metric | Formula |
|---|---|
| Net worth | sum(asset.value) - sum(liability.currentBalance) |
| Monthly income | sum of all incomes normalized to monthly |
| Monthly expenses | sum of all expenses normalized to monthly + sum(liability.monthlyPayment) for unlinked liabilities |
| Monthly cash flow | monthly income - monthly expenses |
| Passive income (monthly) | sum of passive incomes normalized to monthly |
| Passive income ratio | passive income / monthly expenses |
| Months to financial freedom | (monthly expenses - passive income) > 0 ? remaining needed / monthly savings growth : 0 (already free) |
| Debt-to-income ratio | sum(liability.monthlyPayment) / monthly gross income |
| Liquid assets | sum(assets where type in cash, savings_account, stock, bond, etf, crypto) |
| Illiquid assets | sum(assets where type in real_estate, vehicle, business, retirement) |

### Frequency → Monthly Normalization

```
weekly        → × 52/12
biweekly      → × 26/12
monthly       → × 1
quarterly     → × 1/3
semiannually  → × 1/6
annually      → × 1/12
```

---

## Entity Relationships

```
Asset ──1:N──→ Income        (via Income.linkedAssetId)
Liability ──1:1──→ Asset     (via Liability.linkedAssetId, e.g. mortgage → apartment)
Expense ──1:1──→ Liability   (via Expense.linkedLiabilityId, e.g. monthly payment → mortgage)
```

The links are optional — an income can exist without an asset (salary), an expense without a liability (groceries), etc.

---

## Open Design Questions

1. **Multi-currency normalization** — for now store `currency` per entity and display in original currency. Conversion/normalization can come later when needed.

2. **Syncing** — localStorage is browser-only. Future options: export/import JSON file (simplest), or add a lightweight backend (Hono API + SQLite/Turso) for cross-device sync. The flat JSON shape makes migration to any backend trivial.

3. **Integration with existing loan calculator** — the loan calculator remains a separate planning tool. A liability can be manually created from a loan simulation result (future feature: "Save as liability" button).

4. **Recurring vs one-time** — current design covers recurring only. One-time transactions (selling a car, bonus) could be modeled as a frequency variant or as direct edits to asset values + a snapshot. Worth discussing if needed.
