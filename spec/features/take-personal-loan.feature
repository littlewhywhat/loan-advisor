Feature: Take Personal Loan

  Scenario: Take a personal loan
    Given the user provides loan details:
      | field         | value      |
      | name          | Car Loan   |
      | loan_value    | 500000     |
      | interest_rate | 8.0        |
      | currency      | CZK        |
      | start_date    | 2026-04-01 |
      | term_years    | 5          |
    When the user confirms the loan
    Then a TakePersonalLoan event is created with status ACTIVE
    And a Loan entity is created with value 500000 CZK
    And a Cash asset is created with value 500000 CZK
    And an Expense entity is created for the computed monthly payment
