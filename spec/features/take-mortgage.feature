Feature: Take Mortgage

  Scenario: Take mortgage for a flat you live in
    Given the user provides mortgage details:
      | field         | value      |
      | name          | My Flat    |
      | loan_value    | 5000000    |
      | down_payment  | 1000000    |
      | interest_rate | 5.5        |
      | currency      | CZK        |
      | start_date    | 2026-04-01 |
      | term_years    | 30         |
      | growth_rate   | 3.0        |
      | rental        | false      |
    When the user confirms the mortgage
    Then a TakeMortgage event is created with status ACTIVE
    And a Mortgage entity is created with loan value 5000000 CZK and down payment 1000000 CZK
    And a Flat asset is created with value 6000000 CZK and growth rate 0.03
    And an Expense entity is created for the computed monthly payment

  Scenario: Take mortgage for a flat you rent out
    Given the user provides mortgage details:
      | field         | value      |
      | name          | Rental Flat|
      | loan_value    | 3000000    |
      | down_payment  | 600000     |
      | interest_rate | 5.5        |
      | currency      | CZK        |
      | start_date    | 2026-04-01 |
      | term_years    | 30         |
      | growth_rate   | 3.0        |
      | rental        | true       |
      | rental_income | 15000      |
    When the user confirms the mortgage
    Then a TakeMortgage event is created with status ACTIVE
    And a Mortgage entity is created with loan value 3000000 CZK and down payment 600000 CZK
    And a Flat asset is created with value 3600000 CZK and growth rate 0.03
    And an Expense entity is created for the computed monthly payment
    And an Income entity is created with amount 15000 CZK and frequency MONTHLY

  Rule: Down payment can be funded from cash assets via allocations

  Scenario: Down payment funded from a cash asset
    Given the user has an active Cash asset "Loan Cash" with value 2000000 CZK
    When the user creates a TakeMortgage event with:
      | field         | value      |
      | name          | My Flat    |
      | loan_value    | 5000000    |
      | down_payment  | 1000000    |
      | interest_rate | 5.5        |
      | currency      | CZK        |
      | start_date    | 2026-04-01 |
      | term_years    | 30         |
      | growth_rate   | 3.0        |
      | rental        | false      |
    And allocations:
      | cash_asset | amount  |
      | Loan Cash  | 1000000 |
    Then "Loan Cash" value is reduced to 1000000 CZK
    And the cash reserve is not reduced

  Scenario: Down payment funded partly from cash asset, partly from cash reserve
    Given the user has an active Cash asset "Savings" with value 500000 CZK
    And the simulator has accumulated a cash reserve
    When a TakeMortgage strategy event is scheduled with:
      | field         | value      |
      | name          | My Flat    |
      | loan_value    | 5000000    |
      | down_payment  | 1000000    |
      | interest_rate | 5.5        |
      | currency      | CZK        |
      | start_date    | 2027-01-01 |
      | term_years    | 30         |
      | growth_rate   | 3.0        |
      | rental        | false      |
    And allocations:
      | cash_asset | amount |
      | Savings    | 500000 |
    Then "Savings" value is reduced to 0 CZK
    And the cash reserve is reduced by 500000 at the month the mortgage starts
