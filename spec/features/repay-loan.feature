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
    Then the Loan value is updated to the remaining principal minus 200000
    And the Loan startDate is reset to 2026-04-01
    And the Loan endDate remains 2030-01-01
    And the linked Expense amount is recalculated to a lower monthly payment
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
    Then the Loan value is updated to the remaining principal minus 200000
    And the Loan startDate is reset to 2026-04-01
    And the Loan endDate is recalculated to an earlier date
    And the linked Expense amount remains 10138 CZK/monthly
    And a RepayLoan event is created with status ACTIVE

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
    Then the Loan value is set to 0
    And the Loan is effectively paid off
    And the linked Expense amount is set to 0
    And a RepayLoan event is created with status ACTIVE
