Feature: Buy Asset

  Scenario: Buy flat using cash from multiple loans
    Given the user has an active Cash asset "Loan A Cash" with value 3000000 CZK
    And the user has an active Cash asset "Loan B Cash" with value 2000000 CZK
    When the user creates a BuyAsset event with:
      | field       | value      |
      | name        | My Flat    |
      | kind        | flat       |
      | value       | 4000000    |
      | currency    | CZK        |
      | growth_rate | 3.0        |
      | date        | 2026-04-01 |
    And allocations:
      | cash_asset       | amount   |
      | Loan A Cash      | 3000000  |
      | Loan B Cash      | 1000000  |
    Then a BuyAsset event is created with status ACTIVE
    And a Flat asset "My Flat" is created with value 4000000 CZK
    And "Loan A Cash" value is reduced to 0 CZK
    And "Loan B Cash" value is reduced to 1000000 CZK

  Scenario: Buy flat using single loan cash fully
    Given the user has an active Cash asset "Loan Cash" with value 5000000 CZK
    When the user creates a BuyAsset event with:
      | field       | value      |
      | name        | Studio     |
      | kind        | flat       |
      | value       | 5000000    |
      | currency    | CZK        |
      | growth_rate | 2.5        |
      | date        | 2026-06-01 |
    And allocations:
      | cash_asset  | amount   |
      | Loan Cash   | 5000000  |
    Then a BuyAsset event is created with status ACTIVE
    And a Flat asset "Studio" is created with value 5000000 CZK
    And "Loan Cash" value is reduced to 0 CZK
