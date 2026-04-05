Feature: Repay Loan

  Scenario: Partial repayment with reduce_payment strategy
    Given the user has an active Loan with:
      | field         | value      |
      | name          | Car Loan   |
      | loan_value    | 500000     |
      | interest_rate | 8.0        |
      | currency      | CZK        |
      | start_date    | 2025-01-01 |
      | end_date      | 2030-01-01 |
    And the loan has a linked Expense "Car Loan Payment" of 10138 CZK/monthly
    When the user creates a RepayLoan event with:
      | field             | value          |
      | date              | 2026-04-01     |
      | liability_id      | <loan_id>      |
      | repayment_amount  | 200000         |
      | currency          | CZK            |
      | strategy          | reduce_payment |
    Then the event is pre-computed with:
      | field                | value      |
      | new_principal        | 193847     |
      | new_start_date       | 2026-04-01 |
      | new_end_date         | 2030-01-01 |
      | new_monthly_payment  | 5284       |
    And the Loan value is set to 193847 CZK with startDate 2026-04-01
    And the Loan endDate remains 2030-01-01
    And the linked Expense amount is updated to 5284 CZK/monthly
    And a RepayLoan event is created with status ACTIVE

  Scenario: Partial repayment with reduce_term strategy
    Given the user has an active Loan with:
      | field         | value      |
      | name          | Car Loan   |
      | loan_value    | 500000     |
      | interest_rate | 8.0        |
      | currency      | CZK        |
      | start_date    | 2025-01-01 |
      | end_date      | 2030-01-01 |
    And the loan has a linked Expense "Car Loan Payment" of 10138 CZK/monthly
    When the user creates a RepayLoan event with:
      | field             | value          |
      | date              | 2026-04-01     |
      | liability_id      | <loan_id>      |
      | repayment_amount  | 200000         |
      | currency          | CZK            |
      | strategy          | reduce_term    |
    Then the event is pre-computed with:
      | field                | value      |
      | new_principal        | 193847     |
      | new_start_date       | 2026-04-01 |
      | new_end_date         | 2027-11-01 |
      | new_monthly_payment  | 10138      |
    And the Loan value is set to 193847 CZK with startDate 2026-04-01
    And the Loan endDate is set to 2027-11-01
    And the linked Expense amount remains 10138 CZK/monthly
    And a RepayLoan event is created with status ACTIVE

  Scenario: Repayment deducts from cash reserve in simulation
    Given the user has an active Loan with:
      | field         | value      |
      | name          | Car Loan   |
      | loan_value    | 500000     |
      | interest_rate | 8.0        |
      | currency      | CZK        |
      | start_date    | 2025-01-01 |
      | end_date      | 2030-01-01 |
    And the loan has a linked Expense "Car Loan Payment" of 10138 CZK/monthly
    And the simulator has accumulated a cash reserve
    When a RepayLoan strategy event is scheduled with repayment_amount 200000 CZK
    Then the cash reserve is reduced by 200000 at the month the repayment occurs
    And the loan balance and monthly payment are updated per the chosen strategy

  Rule: Repay loan form shows projected values at selected date

  Scenario: Form preview shows loan balance and cash reserve at repayment date
    Given the user has an active Loan with:
      | field         | value      |
      | name          | Car Loan   |
      | loan_value    | 500000     |
      | interest_rate | 8.0        |
      | currency      | CZK        |
      | start_date    | 2025-01-01 |
      | end_date      | 2030-01-01 |
    And the simulator has accumulated a cash reserve
    When the user opens the RepayLoan form and selects the loan
    And the user sets the repayment date to 2027-01-01
    Then the form shows the loan balance projected to 2027-01-01
    And the form shows the cash reserve projected to January 2027
    And both values reflect any previously added strategy events

  Rule: Repayment can be funded from cash assets via allocations

  Scenario: Repayment funded fully from a cash asset
    Given the user has an active Loan with:
      | field         | value      |
      | name          | Car Loan   |
      | loan_value    | 500000     |
      | interest_rate | 8.0        |
      | currency      | CZK        |
      | start_date    | 2025-01-01 |
      | end_date      | 2030-01-01 |
    And the loan has a linked Expense "Car Loan Payment" of 10138 CZK/monthly
    And the user has an active Cash asset "Loan A Cash" with value 300000 CZK
    When the user creates a RepayLoan event with:
      | field             | value          |
      | date              | 2026-04-01     |
      | liability_id      | <loan_id>      |
      | repayment_amount  | 200000         |
      | currency          | CZK            |
      | strategy          | reduce_payment |
    And allocations:
      | cash_asset   | amount |
      | Loan A Cash  | 200000 |
    Then "Loan A Cash" value is reduced to 100000 CZK
    And the cash reserve is not reduced

  Scenario: Repayment funded partly from cash asset, partly from cash reserve
    Given the user has an active Loan with:
      | field         | value      |
      | name          | Car Loan   |
      | loan_value    | 500000     |
      | interest_rate | 8.0        |
      | currency      | CZK        |
      | start_date    | 2025-01-01 |
      | end_date      | 2030-01-01 |
    And the loan has a linked Expense "Car Loan Payment" of 10138 CZK/monthly
    And the user has an active Cash asset "Loan A Cash" with value 100000 CZK
    And the simulator has accumulated a cash reserve
    When a RepayLoan strategy event is scheduled with:
      | field             | value          |
      | repayment_amount  | 200000         |
      | strategy          | reduce_term    |
    And allocations:
      | cash_asset   | amount  |
      | Loan A Cash  | 100000  |
    Then "Loan A Cash" value is reduced to 0 CZK
    And the cash reserve is reduced by 100000 at the month the repayment occurs

  Scenario: Repayment from multiple cash assets
    Given the user has an active Loan with:
      | field         | value      |
      | name          | Car Loan   |
      | loan_value    | 500000     |
      | interest_rate | 8.0        |
      | currency      | CZK        |
      | start_date    | 2025-01-01 |
      | end_date      | 2030-01-01 |
    And the loan has a linked Expense "Car Loan Payment" of 10138 CZK/monthly
    And the user has an active Cash asset "Loan A Cash" with value 300000 CZK
    And the user has an active Cash asset "Savings" with value 200000 CZK
    When the user creates a RepayLoan event with:
      | field             | value          |
      | date              | 2026-04-01     |
      | liability_id      | <loan_id>      |
      | repayment_amount  | 250000         |
      | currency          | CZK            |
      | strategy          | reduce_payment |
    And allocations:
      | cash_asset   | amount  |
      | Loan A Cash  | 150000  |
      | Savings      | 100000  |
    Then "Loan A Cash" value is reduced to 150000 CZK
    And "Savings" value is reduced to 100000 CZK
    And the cash reserve is not reduced

  Scenario: Full payoff
    Given the user has an active Loan with:
      | field         | value      |
      | name          | Car Loan   |
      | loan_value    | 500000     |
      | interest_rate | 8.0        |
      | currency      | CZK        |
      | start_date    | 2025-01-01 |
      | end_date      | 2030-01-01 |
    And the loan has a linked Expense "Car Loan Payment" of 10138 CZK/monthly
    When the user creates a RepayLoan event with:
      | field             | value          |
      | date              | 2026-04-01     |
      | liability_id      | <loan_id>      |
      | repayment_amount  | 500000         |
      | currency          | CZK            |
      | strategy          | reduce_payment |
    Then the event is pre-computed with:
      | field                | value      |
      | new_principal        | 0          |
      | new_start_date       | 2026-04-01 |
      | new_end_date         | 2026-04-01 |
      | new_monthly_payment  | 0          |
    And the Loan value is set to 0 CZK
    And the Loan is effectively paid off
    And the linked Expense amount is set to 0 CZK/monthly
    And a RepayLoan event is created with status ACTIVE
