Feature: Simulator Strategy

  A strategy is a series of planned events that the user builds
  inside the simulator to explore "what-if" scenarios.

  Rule: User can build a strategy from planned events

  Scenario: Add a strategy event
    Given the simulator is open
    When the user adds a strategy event of type AddIncome:
      | name     | amount | currency | frequency | date       |
      | Side Gig | 30000  | CZK      | monthly   | 2028-01-01 |
    Then the strategy panel shows 1 event

  Scenario: Add multiple strategy events
    Given the simulator is open
    When the user adds a strategy event of type AddIncome:
      | name     | amount | currency | frequency | date       |
      | Side Gig | 30000  | CZK      | monthly   | 2028-01-01 |
    And the user adds a strategy event of type TakeMortgage:
      | name        | loan_value | down_payment | interest_rate | start_date | term_years | growth_rate | rental |
      | Rental Flat | 3000000    | 600000       | 5.5           | 2027-06-01 | 30         | 3.0         | true   |
    Then the strategy panel shows 2 events

  Scenario: Remove a strategy event
    Given the strategy panel has 2 events
    When the user removes the first strategy event
    Then the strategy panel shows 1 event

  Rule: Simulation projects both baseline and strategy

  Scenario: Strategy events affect simulation projection
    Given an active AddIncome event:
      | name   | amount | currency | frequency |
      | Salary | 80000  | CZK      | monthly   |
    And a strategy event of type AddExpense:
      | name      | amount | currency | frequency | date       |
      | Childcare | 25000  | CZK      | monthly   | 2028-09-01 |
    When the simulator runs
    Then the baseline projection uses only existing events
    And the strategy projection includes both existing and strategy events
    And the charts show both baseline and strategy lines

  Scenario: Strategy event applies at its date during simulation
    Given an active AddIncome event:
      | name   | amount | currency | frequency |
      | Salary | 80000  | CZK      | monthly   |
    And a strategy event of type AddExpense:
      | name      | amount | currency | frequency | date       |
      | Childcare | 25000  | CZK      | monthly   | 2028-09-01 |
    When the simulator runs
    Then the strategy projection cash flow before September 2028 is 80000
    And the strategy projection cash flow from September 2028 onward is 55000

  Scenario: Snapshot detail marks strategy entities
    Given a strategy event of type AddIncome:
      | name     | amount | currency | frequency | date       |
      | Side Gig | 30000  | CZK      | monthly   | 2028-01-01 |
    When the user sets view snapshot to month 6, year 2029
    Then the income statement shows "Side Gig" with a strategy badge

  Rule: Charts show baseline vs strategy comparison

  Scenario: Dual-line charts when strategy is active
    Given at least one strategy event exists
    When the simulator runs
    Then each chart shows a solid line for baseline
    And each chart shows a dashed line for strategy
    And the legend distinguishes baseline from strategy

  Scenario: No strategy events shows single baseline line
    Given the strategy is empty
    When the simulator runs
    Then each chart shows only the baseline line

  Rule: User can apply or discard a strategy

  Scenario: Apply strategy commits events
    Given the strategy panel has 2 events
    When the user clicks "Apply Strategy"
    Then a confirmation dialog shows the list of events to be applied
    When the user confirms
    Then the strategy events become active events
    And the strategy is cleared

  Scenario: Discard strategy
    Given the strategy panel has 2 events
    When the user clicks "Discard Strategy"
    Then a confirmation dialog asks to confirm
    When the user confirms
    Then the strategy is cleared

  Rule: Strategy persists across page navigation

  Scenario: Strategy survives page refresh
    Given the strategy panel has 2 events
    When the user refreshes the page
    Then the strategy panel still shows 2 events
