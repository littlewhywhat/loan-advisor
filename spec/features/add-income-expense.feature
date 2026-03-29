Feature: Add standalone Income and Expense

  Scenario: Add a standalone income
    Given the user provides income details:
      | field     | value   |
      | name      | Salary  |
      | amount    | 80000   |
      | currency  | CZK     |
      | frequency | MONTHLY |
    When the user confirms the income
    Then an AddIncome event is created with status ACTIVE
    And an Income entity is created with amount 80000 CZK and frequency MONTHLY

  Scenario: Add a standalone expense
    Given the user provides expense details:
      | field     | value      |
      | name      | Groceries  |
      | amount    | 8000       |
      | currency  | CZK        |
      | frequency | MONTHLY    |
    When the user confirms the expense
    Then an AddExpense event is created with status ACTIVE
    And an Expense entity is created with amount 8000 CZK and frequency MONTHLY
