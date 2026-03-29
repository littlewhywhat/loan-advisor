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
    And a Flat asset is created with value 6000000 CZK and growth rate 3.0
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
    And a Flat asset is created with value 3600000 CZK and growth rate 3.0
    And an Expense entity is created for the computed monthly payment
    And an Income entity is created with amount 15000 CZK and frequency MONTHLY
