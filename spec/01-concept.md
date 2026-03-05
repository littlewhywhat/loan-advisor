UI Structure
Section 1: Your Monthly Budget (two sliders)
Control	Type	Details
Monthly expense	Slider + value	Step: 1,000 CZK. The recurring cost you want to eventually make "free"
Monthly savings	Slider + value	Step: 500 CZK (or similar). How much extra you can put aside each month
Section 2: Investment Card (hardcoded for now)
A single card showing the investment option. Displays:

Label: e.g. "Dividend ETF"
Yearly return: 8%
Tax: 15%
Calculated monthly net return: (0.08 * (1 - 0.15)) / 12 ≈ 0.567%
Future: multiple cards (bonds, REITs, etc.) with different risk/return profiles, user picks one.

Section 3: Loan Card (hardcoded rate, dynamic term)
A card showing the loan configuration. Displays:

Annual interest rate: e.g. 5% (hardcoded for now, future: fetched from banks)
Term (years): Slider (e.g. 5–30 years)
Auto-calculated from the two inputs + investment return + loan rate + term:

Loan A ("savings loan"): monthly payment = your savings amount → shows principal P1
Loan B ("expense loan"): monthly payment ≤ expense → shows principal P2. This part is constrained: P2 * monthly_return tells you how much of the expense is covered by dividends from this portion alone
Total loan: P1 + P2
Total monthly payment: Loan A payment + Loan B payment
Expense coverage: what % of your daily expense is paid by dividends from the total investment (P1 + P2) * monthly_return / expense
The key tension: Loan B's payment can only be as high as the dividends from the total investment can justify — otherwise you're paying a loan AND paying the expense. If (P1 + P2) * monthly_return >= expense, the expense is fully covered. If not, Loan B's payment is capped at what the dividends can support.

Section 4: Results
The output values we agreed on:

Required investment (lump sum): P1 + P2
Monthly loan payment: total across both loans
Total interest paid: across both loans
Break-even month: total interest / monthly expense
Savings-only: time to reach same lump sum: iterative calc, saving savings amount/month at the same return rate
Loan advantage (time saved): difference in years
Post-loan passive income: (P1 + P2) * monthly_return per month
Page Layout (top to bottom)
┌─────────────────────────────────────────────┐
│  Monthly Expense          [====|====] 3,000 │
│  Monthly Savings          [==|======] 3,364 │
└─────────────────────────────────────────────┘
┌─────────────────────┐
│  📈 Dividend ETF     │
│  Return: 8%/yr       │
│  Tax: 15%            │
│  Net monthly: 0.567% │
└─────────────────────┘
┌──────────────────────────────────────────────┐
│  🏦 Loan                                     │
│  Rate: 5%/yr                                 │
│  Term:  [=====|=====] 10 years               │
│                                              │
│  Loan A (savings):  3,364/mo → 317,412 CZK  │
│  Loan B (expense):  3,000/mo → 283,019 CZK  │
│  Total loan:          600,431 CZK            │
│  Expense coverage:    100%                   │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│  Results                                     │
│                                              │
│  Investment needed:     600,431 CZK          │
│  Monthly payment:       6,364 CZK            │
│  Total interest:        163,249 CZK          │
│  Break-even:            ~54 months (4.5 yr)  │
│  Savings-only time:     ~14.5 years          │
│  Time saved with loan:  ~4.5 years           │
│  Post-loan income:      3,402 CZK/mo         │
└──────────────────────────────────────────────┘
One question before implementation: for the Loan B constraint — when the total dividends don't fully cover the expense, should we cap Loan B's payment at what dividends can justify (meaning you still pay some coffee out of pocket), or should we show a warning that the numbers don't work at this configuration? Or both?


> should we cap Loan B's payment at what dividends can justify (meaning you still pay some coffee out of pocket)
we should cap. so that you show which part of expense you can cover with those.

page layout looks great. one thing is though that numbers dont work as post loan income is bigger than inital expense - that means that probably we could take lower loan. so maybe don't calculate loan a and loan b but just one loan that has monthyl payment = full monthly saving + some part or full monthly expense (here exactly we need to be able to understand which part of expense we can cover so that)

which part of expense we can cover so that - what i mean by that is that in our example of 3000 czk and 3364 savings - if user put expense bigger - say 5k - than we can't take loan with monthly payment = 3364 svaing + 5k expense because result loan not gonna cover whole 5k.

thats maybe hardest part to compute as for now i am not sure how... i think some algorithm is needed here. maybe ni the beginning first version we can just show that it doesn't work, show how big loan needs to be and that you need to save more by this amount to afford it. 

> save more by this amount to afford it
actually yes this is what we can show if it doesn't work and continue calculations and outputs. and then user adjust it for his needs (reduce expense or increases savings)


The Core Equation
One loan. Monthly payment = S + X, where:

S = monthly savings (user input)
X = the portion of expense covered by dividends (computed)
E = monthly expense (user input)
The constraint: dividends from the loan principal must equal X.

P = (S + X) * factor        (standard loan principal formula)
X = P * monthly_return       (dividends must cover X)
Where factor = (1 - (1+r)^(-n)) / r, r = monthly loan rate, n = months.

Substituting:

X = (S + X) * factor * monthly_return
X = S * factor * d / (1 - factor * d)     where d = monthly_return
Two cases:

X >= E (dividends would exceed expense): Cap X = E. Loan payment = S + E. You take a smaller loan than the math allows. Expense is fully covered. Post-loan income = full expense or more.

X < E (dividends can't cover full expense): Loan payment = S + X. Only X of the expense is covered. Show: "Your expense is partially covered: X out of E. Save additional Z/month to fully cover it." Where Z = E * (1 - factor * d) / (factor * d) - S.

Updated UI Structure
┌─────────────────────────────────────────────┐
│  Monthly Expense          [====|====] 3,000 │
│  Monthly Savings          [==|======] 3,364 │
└─────────────────────────────────────────────┘
┌─────────────────────┐
│  Dividend ETF        │
│  Return: 8%/yr       │
│  Tax: 15%            │
│  Net monthly: 0.567% │
└─────────────────────┘
┌──────────────────────────────────────────────┐
│  Loan                                        │
│  Rate: 5%/yr                                 │
│  Term:  [=====|=====] 10 years               │
│                                              │
│  Loan amount:      546,928 CZK              │
│  Monthly payment:  5,802 CZK                │
│    from savings:   3,364 CZK                │
│    from dividends: 2,438 CZK                │
│                                              │
│  ⚠ Covers 2,438 of 3,000 expense (81%)     │
│  Save 562 CZK more/month for full coverage  │
│                                              │
│  (or if fully covered:)                      │
│  ✓ Expense fully covered by dividends       │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│  Results                                     │
│                                              │
│  Investment needed:     546,928 CZK          │
│  Monthly payment:       5,802 CZK           │
│  Total interest:        149,312 CZK          │
│  Break-even:            ~50 months (4.1 yr)  │
│  Savings-only time:     ~13.2 years          │
│  Time saved with loan:  ~3.2 years           │
│  Post-loan income:      3,101 CZK/mo        │
└──────────────────────────────────────────────┘
Note: numbers above are illustrative — they'll come from the actual formula once implemented.

Summary of changes
One loan, not two. Payment = savings + covered portion of expense.
X is computed algebraically, not iteratively. Clean closed-form.
Savings-only time still uses iterative simulation (as agreed).
Partial coverage: show the gap and how much more savings are needed. User adjusts sliders.
Full coverage: clean success state.
Does this look right to you?


numbers don't seem to be correct...

512 767 * 0.0057 = 2922 but i see 2906

yes i want if it's 0.5666 to make it 0.56 and use and calculate with 0.56 and make it visible in UI as 0.56 not as 0.57.