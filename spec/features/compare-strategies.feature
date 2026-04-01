Feature: Compare Strategies

  Users can create up to 4 named strategies and compare their projections.
  Each strategy is shown as a self-contained column with its own charts
  and snapshot detail, both compared against the shared baseline.
  On desktop, columns are side by side. On mobile, users tab between them.

  Rule: User can manage up to 4 strategies

  Scenario: Create a new strategy
    Given the simulator is open
    When the user clicks "New Strategy"
    And enters the name "Buy flat in Serbia"
    Then a new empty strategy appears in the strategy list
    And it becomes the active strategy for editing

  Scenario: Cannot create more than 4 strategies
    Given 4 strategies already exist
    Then the "New Strategy" button is disabled

  Scenario: Rename a strategy
    Given a strategy named "Buy flat in Serbia"
    When the user renames it to "Serbia plan A"
    Then the strategy list shows "Serbia plan A"

  Scenario: Duplicate a strategy
    Given a strategy "Plan A" with 3 events
    And fewer than 4 strategies exist
    When the user duplicates "Plan A"
    Then a new strategy "Plan A (copy)" appears with the same 3 events
    And entity IDs in the copy are regenerated to avoid conflicts

  Scenario: Delete a strategy
    Given the strategy list has "Plan A" and "Plan B"
    When the user deletes "Plan B"
    Then the strategy list shows only "Plan A"

  Scenario: Switch active strategy for editing
    Given strategies "Plan A" and "Plan B" exist
    When the user selects "Plan B" from the strategy list
    Then the strategy panel shows "Plan B" events for editing
    And "Plan B" is highlighted as active

  Rule: Simulation runs each strategy independently against baseline

  Scenario: Each strategy produces its own baseline-vs-strategy result
    Given strategies "Plan A" and "Plan B" each with different events
    When the simulator runs
    Then "Plan A" has its own baseline and strategy projection
    And "Plan B" has its own baseline and strategy projection
    And the baseline is the same across both

  Scenario: Empty strategies are excluded from comparison
    Given strategies "Plan A" (with events) and "Plan B" (empty)
    When the simulator runs
    Then only "Plan A" appears in the comparison view

  Rule: Each strategy column is a self-contained baseline-vs-strategy view

  Scenario: Strategy column contains charts and snapshot detail
    Given "Plan A" exists with events
    Then the "Plan A" column shows:
      | section         | content                                |
      | charts          | baseline (solid) vs Plan A (dashed)    |
      | income statement| baseline values vs Plan A values       |
      | balance sheet   | baseline values vs Plan A values       |

  Scenario: Single strategy view is identical to the existing UI
    Given only "Plan A" exists with events
    Then the view is identical to the current single-strategy layout
    And no column wrapper is added

  Rule: Desktop shows strategy columns side by side

  Scenario: Two strategies on desktop
    Given "Plan A" and "Plan B" exist with events
    And the viewport is wider than the mobile breakpoint
    Then two columns are shown side by side
    And each column has its own charts and snapshot detail vs baseline

  Scenario: Columns share the same view snapshot month/year
    Given "Plan A" and "Plan B" columns are visible
    When the user changes the view snapshot to June 2030
    Then both columns update to show June 2030

  Rule: Mobile shows one strategy at a time via tabs

  Scenario: Tab-based switching on mobile
    Given "Plan A" and "Plan B" exist with events
    And the viewport is narrower than the mobile breakpoint
    Then a tab bar shows "Plan A", "Plan B"
    And the visible content shows the selected strategy vs baseline

  Scenario: Swipe between strategies on mobile
    Given the tab bar shows "Plan A", "Plan B"
    And "Plan A" is currently shown
    When the user swipes left
    Then the view switches to "Plan B" vs baseline

  Rule: Strategy library persists across sessions

  Scenario: All strategies survive page refresh
    Given the strategy list has "Plan A" and "Plan B"
    When the user refreshes the page
    Then the strategy list still shows "Plan A" and "Plan B"

  Rule: Apply and discard work per-strategy

  Scenario: Apply a single strategy
    Given strategies "Plan A" and "Plan B" exist
    When the user clicks "Apply" on "Plan A"
    Then "Plan A" events become active events
    And "Plan A" is removed from the strategy list
    And "Plan B" remains unchanged

  Scenario: Discard a single strategy
    Given strategies "Plan A" and "Plan B" exist
    When the user clicks "Discard" on "Plan A"
    Then "Plan A" is removed from the strategy list
    And "Plan B" remains unchanged
