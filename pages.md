# Pages — Functional Requirements

## Dashboard (`/`)

Rich Dad Poor Dad–style financial statement on one screen.

**Income Statement section:**
- Shows all income sources grouped: manual (salary, freelance) and asset-derived (rent, dividends, interest)
- Shows all expenses grouped: manual (living, housing, transport) and debt service (loan payments)
- Asset-derived income and debt service are computed from assets and liabilities, not entered manually
- Each line shows monthly amount after tax (using owner-based tax rules)
- Bottom line: monthly cash flow = total income − total expenses
- Business vs personal breakdown visible per line

**Balance Sheet section:**
- Assets listed with current values, grouped by type (flat, ETF, cash)
- Liabilities listed with remaining principal
- Net worth = total assets − total liabilities
- Debt-to-asset ratio displayed
- Each asset shows its linked liability (if any) so you see equity at a glance (e.g. flat 300k − mortgage 200k = 100k equity)

**Quick metrics:**
- Monthly cash flow
- Passive income (asset-derived income only)
- Passive income coverage ratio (passive income / manual expenses)
- Debt-to-asset ratio

---

## Assets Manager (`/assets`)

CRUD for everything you own.

**Asset list:**
- Cards or rows, one per asset
- Grouped or filterable by type (flat, ETF, cash) and owner (personal, business)
- Each shows: name, current value, type badge, owner badge, monthly income (computed), linked loan name + remaining balance

**Add / Edit asset:**
- Type selector changes which fields appear
- Flat: current value, monthly rent, annual appreciation %, monthly maintenance, annual vacancy rate %
- ETF: current value, annual total return %, dividend yield %
- Cash: current value, interest rate %
- Owner: personal or business
- Link to liability: dropdown of existing liabilities (optional)

**Delete:**
- Confirmation required
- Warns if a liability is linked to this asset

---

## Liabilities Manager (`/liabilities`)

CRUD for everything you owe.

**Liability list:**
- Cards or rows, one per liability
- Each shows: name, type badge, owner badge, remaining principal, monthly payment, rate, remaining term, linked asset name

**Add / Edit liability:**
- Type: mortgage, personal loan, investment loan
- Owner: personal or business
- Original principal, remaining principal, annual rate %, term in years, start date
- Monthly payment is auto-computed from remaining principal, rate, and remaining term
- Link to asset: dropdown of existing assets (optional)

**Amortization detail (expandable per liability):**
- Table showing month-by-month: payment, principal portion, interest portion, remaining balance
- Useful to answer "how much equity have I built in month X" and "how much interest am I paying vs principal right now"

**Delete:**
- Confirmation required
- Warns if an asset is linked to this liability

---

## Strategy Simulator (`/simulator`)

Side-by-side comparison of two financial strategies projected forward in time.

### Strategy setup

- Two strategy slots displayed as columns
- Each strategy contains its own set of assets, liabilities, incomes, expenses
- "Import current state" button fills a strategy with data from Dashboard/Assets/Liabilities
- "Clone other" button copies the other strategy as starting point for modifications
- Each strategy's assets and liabilities are editable inline (add, remove, change values)
- Reinvestment target: dropdown to pick which asset receives surplus cash flow each month
- Projection horizon: shared slider, 5–30 years

### Simulation logic

Runs month-by-month for the projection horizon. Each month:

1. Compute income from all sources (manual + asset-derived, after tax)
2. Compute expenses (manual + active liability payments)
3. Cash flow = income − expenses
4. Reduce each liability's remaining principal by amortized amount; if fully paid → no more payments from next month (this is the moment debt service drops and cash flow jumps)
5. Grow asset values: flat by appreciation, ETF by price return (total return minus dividend yield since dividends are already counted as income)
6. If cash flow > 0 and reinvestment target is set → add surplus to that asset's value (compounding engine)

### Output — Charts

Three charts, each with two lines (Strategy A vs B):

1. **Net Worth over time** — total assets minus total liabilities per month. Shows when the leveraged strategy overtakes the conservative one (if it does). The headline chart.

2. **Monthly Cash Flow** — shows cash flow per month. Reveals the "pain period" where leveraged strategy has negative cash flow, the jump when a loan is paid off, and the convergence/divergence point.

3. **Passive Income vs Expenses** — two rising lines (passive income per strategy) against a horizontal line (manual expenses). Where passive income crosses expenses = financial independence date for that strategy.

### Output — Comparison table

Key metrics at milestone years (5, 10, 15, 20):

- Net worth
- Monthly cash flow
- Monthly passive income
- Debt-to-asset ratio

Summary row:
- Financial independence date (month/year when passive income ≥ manual expenses)
- Total interest paid over the full projection
- Peak negative cash flow (worst month)
- Peak debt-to-asset ratio

### Output — Insights

Auto-generated text based on comparison:
- Which strategy has higher net worth at each milestone
- When (if ever) the trailing strategy overtakes the leading one
- Difference in FI dates
- Total interest cost difference
- Duration and depth of negative cash flow period
