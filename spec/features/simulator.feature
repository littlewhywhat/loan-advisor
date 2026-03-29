Feature: Simulator

  Rule: Simulation projects current state forward month-by-month to a target date

  Scenario: Configure simulation parameters
    Given the simulator header shows:
      | setting                  | default       |
      | target_month             | current month |
      | target_year              | current + 20  |
      | cash_reserve_growth_rate | 0%            |
    When the user changes target_year to 2036
    And the user changes target_month to 6
    And the user changes cash_reserve_growth_rate to 2%
    Then the simulation reruns from today to June 2036 with the new parameters

  Rule: Assets grow by their growth rate compounded monthly

  Scenario: Project net worth with a growing asset
    Given an active AddAsset event:
      | name    | kind | value   | currency | growth_rate |
      | Savings | cash | 1000000 | CZK      | 6.0         |
    When the simulator runs for 12 months
    Then month 12 snapshot shows:
      | net_worth | 1061678 |
      | cash_flow | 0       |

  Rule: Income minus expenses produces monthly cash flow

  Scenario: Project cash flow from income and expense
    Given an active AddIncome event:
      | name   | amount | currency | frequency |
      | Salary | 80000  | CZK      | monthly   |
    And an active AddExpense event:
      | name      | amount | currency | frequency |
      | Groceries | 20000  | CZK      | monthly   |
    When the simulator runs for 1 month
    Then month 1 snapshot shows:
      | cash_flow      | 60000 |
      | total_income   | 80000 |
      | total_expenses | 20000 |

  Rule: Positive cash flow accumulates into a cash reserve on the asset side

  Scenario: Positive cash flow accumulates into cash reserve
    Given an active AddIncome event:
      | name   | amount | currency | frequency |
      | Salary | 80000  | CZK      | monthly   |
    And an active AddExpense event:
      | name      | amount | currency | frequency |
      | Groceries | 20000  | CZK      | monthly   |
    And cash_reserve_growth_rate is 0%
    When the simulator runs for 3 months
    Then the cash reserve at month 3 is 180000
    And the accumulated deficit at month 3 is 0

  Scenario: Cash reserve earns configured growth rate
    Given an active AddIncome event:
      | name   | amount | currency | frequency |
      | Salary | 80000  | CZK      | monthly   |
    And an active AddExpense event:
      | name      | amount | currency | frequency |
      | Groceries | 20000  | CZK      | monthly   |
    And cash_reserve_growth_rate is 6%
    When the simulator runs for 12 months
    Then the cash reserve at month 12 is greater than 720000

  Rule: Negative cash flow accumulates into a deficit on the liability side

  Scenario: Negative cash flow accumulates into deficit
    Given an active AddExpense event:
      | name | amount | currency | frequency |
      | Rent | 30000  | CZK      | monthly   |
    When the simulator runs for 3 months
    Then the cash reserve at month 3 is 0
    And the accumulated deficit at month 3 is 90000

  Rule: Liabilities amortize and their linked expenses stop at payoff

  Scenario: Loan amortization reduces liability and expense stops at payoff
    Given an active TakeMortgage event:
      | loan_value | down_payment | interest_rate | start_date | term_years | growth_rate | rental |
      | 5000000    | 1000000      | 5.5           | 2026-04-01 | 30         | 3.0         | false  |
    When the simulator runs for 360 months
    Then the mortgage balance at month 360 is 0
    And the mortgage expense is excluded from month 361 onward

  Rule: Net worth = total assets + cash reserve - total liabilities - accumulated deficit

  Scenario: Net worth computed from all components
    Given an active AddAsset event:
      | name    | kind | value   | currency | growth_rate |
      | Savings | cash | 2000000 | CZK      | 3.0         |
    And an active TakePersonalLoan event:
      | loan_value | interest_rate | start_date | term_years |
      | 500000     | 8.0           | 2026-04-01 | 5          |
    When the simulator runs for 1 month
    Then month 1 net_worth equals total_assets + cash_reserve - total_liabilities - accumulated_deficit
