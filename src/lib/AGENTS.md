# Domain Logic Library

Core finance calculations, event sourcing, and simulation.

## Event Sourcing (`deriveState.ts`)

- **`emptyState()`**: Returns zeroed `DerivedState`.
- **`cloneState(state)`**: Deep-clones the entire derived state (assets, liabilities, incomes, expenses) to preserve immutability.
- **`applyEvents(state, events)`**: Applies an array of `FinanceEvent` to a starting state. Returns new state. **Never mutates input.**
- **`deriveState(events, filter?)`**: Convenience — starts from empty, optionally filters by status (`'active'` / `'archived'`), applies events.

### Rules

- Every `case` in `applyEvents` must clone entities before mutation.
- Linked entities (e.g., `event.allocations`) must update references by ID; if the referenced asset/liability is missing, skip silently (defensive).
- When adding a new event type: add its `case` in `applyEvents`, update `src/types/events.ts`, update `spec/diagram/events.puml`, add or extend a `.feature` file.

## Simulation (`simulate.ts`)

Month-by-month projection from a derived state + strategy events. Used by `/simulator`.

### Key functions

- **`runSimulation(derived, strategyEvents, config, options?)`**: Projects forward to `config.targetMonth/targetYear`. Returns `MonthSnapshot[]`.
- **`MonthSnapshot`**: Includes `totalAssets`, `totalLiabilities`, `totalIncome`, `totalExpenses`, `cashFlow`, per-entity arrays.

### Simulation invariants

- Assets grow by `growthRate` monthly (compounded).
- Liabilities amortize using `loanCalc.remainingBalance` + `elapsedMonths`.
- When a liability's `endDate` is reached or balance hits zero, its monthly expense stops.
- Surplus cash flow goes to `cashReserveGrowthRate` or a designated reinvestment asset (strategy-specific).

## Calculations (`loanCalc.ts`, `amortization.ts`, `expenseCalc.ts`)

Pure functions. No side effects. All take explicit parameters; no hidden global state.

- **`loanCalc.ts`**: `monthlyPaymentFromMonths`, `remainingBalance`, `elapsedMonths`, `monthsBetween`.
- **`amortization.ts`**: Generates full amortization schedules (month, principal, interest, balance).
- **`expenseCalc.ts`**: Converts expense frequency to monthly equivalent.

## Event Builders (`eventBuilders.ts`)

Factory functions that construct valid `FinanceEvent` payloads with `id`, `createdAt`, `status`, and defaults. Use these instead of inline object literals in UI code.
