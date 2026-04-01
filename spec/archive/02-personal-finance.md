# Personal Finance Storage Design

## Overview

Extend the loan advisor into a personal finance dashboard. Storage uses `localStorage` with a single JSON object. Existing loan calculator storage (`loan-advisor-calculations`) remains untouched — the new finance data lives under a separate key.

**Storage key:** `personal-finance`

**Top-level shape:**

```ts
type Currency = 'CZK' | 'EUR'

type FinanceStore = {
  currency: Currency
  assets: Asset[]
  liabilities: Liability[]
  incomes: Income[]
  expenses: Expense[]
}
```

---

## Entities

### Asset

Something you own that has monetary value.

```ts
type AssetType =
  | 'cash'
  | 'real_estate'
  | 'etf'
  | 'crypto'

type Asset = {
  id: string
  name: string
  type: AssetType
  value: number
  currency: Currency
  linkedIncomeIds: string[]
  createdAt: string
  updatedAt: string
}
```

---

### Liability

Something you owe — a debt or financial obligation.

```ts
type LiabilityBase = {
  id: string
  type: LiabilityType
  name: string
  createdAt: string
  updatedAt: string
}

type LiabilityType = 'loan' | 'rental'

type LoanType =
  | 'living_mortgage'
  | 'american_mortgage'
  | 'business'
  | 'personal'

type Loan = {
  type: 'loan'
  loanType: LoanType
  originalAmount: number
  currentBalance: number
  interestRate: number
  monthlyPayment: number
  startDate: string
  endDate: string | null
  linkedAssetId: string | null
}

type Liability = LiabilityBase | Loan
```

**Examples:** mortgage (4.5%, 25yr, 3.2M CZK), car loan (6%, 5yr, 400k CZK), credit card balance (revolving, 15k CZK).

---

### Income

A source of money coming in, recurring or one-time.

```ts
type IncomeType =
  | 'salary'
  | 'rental'
  | 'dividends'

type Frequency =
  | 'monthly'
  | 'quarterly'
  | 'annually'

type Income = {
  id: string
  name: string
  type: IncomeType
  amount: number
  frequency: Frequency
  isPassive: boolean
  currency: string
  linkedAssetId: string | null
  createdAt: string
  updatedAt: string
}
```

---

### Expense

A recurring cost or financial commitment.

```ts
type ExpenseCategory =
  | 'living_expense'
  | 'liability'

type Expense = {
  id: string
  name: string
  category: ExpenseCategory
  amount: number
  frequency: Frequency
  isEssential: boolean
  currency: string
  linkedLiabilityId: string | null  // optional: ties to a liability (mortgage payment → mortgage)
  createdAt: string
  updatedAt: string
}
```

**Examples:** rent + groceries + utilities (living_expense, 30k/mo), mortgage payment (liabilities, 14k/mo, linked to mortgage liability), car loan payment (liabilities, 8k/mo).

---

### Frequency → Monthly Normalization

```
monthly       → × 1
quarterly     → × 1/3
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
