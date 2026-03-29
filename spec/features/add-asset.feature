Feature: Add standalone Asset

  Scenario: Add a standalone cash asset
    Given the user provides asset details:
      | field       | value          |
      | name        | Savings        |
      | kind        | cash           |
      | value       | 500000         |
      | currency    | CZK            |
      | growth_rate | 3.0            |
    When the user confirms the asset
    Then an AddAsset event is created with status ACTIVE
    And a Cash asset is created with value 500000 CZK and growth rate 0.03

  Scenario: Add a standalone flat asset
    Given the user provides asset details:
      | field       | value          |
      | name        | Family House   |
      | kind        | flat           |
      | value       | 8000000        |
      | currency    | CZK            |
      | growth_rate | 2.5            |
    When the user confirms the asset
    Then an AddAsset event is created with status ACTIVE
    And a Flat asset is created with value 8000000 CZK and growth rate 0.025
