Feature: Calendar

  The calendar page shows all finance events on a year-based timeline.
  Each event appears as a point event in the month it occurred.
  Liabilities (loans, mortgages) additionally appear as multi-month
  bars stretching across month cells, like multi-day events in
  Google Calendar.

  Rule: Year grid shows 12 month cells with event indicators

  Scenario: Month cells show dot indicators for months with events
    Given active events exist in April and September 2026
    When the user opens the calendar page
    Then the year grid shows 12 month cells for 2026
    And April and September cells show dot indicators
    And other month cells are empty

  Scenario: Navigate between years
    Given events exist in 2026 and 2027
    When the user clicks the forward arrow on the year navigator
    Then the year grid updates to show 2027
    And only months with events in 2027 show indicators

  Scenario: Click a month cell to scroll to its detail section
    Given April 2026 has 3 events
    When the user clicks the April cell in the year grid
    Then the page scrolls to the April 2026 detail section

  Rule: Liabilities appear as multi-month bars across month cells

  Scenario: Mortgage bar spans from start month through December
    Given a TakeMortgage event starting April 2026 with term 30 years
    When the user views calendar year 2026
    Then a bar labeled "My Flat" spans from the April cell through December
    And the bar shows a continuation arrow indicating it ends in 2056

  Scenario: Loan bar contained within a single year
    Given a TakePersonalLoan event from March 2026 to November 2026
    When the user views calendar year 2026
    Then a bar labeled "Car Loan" spans from March through November

  Scenario: Liability bar spans full width for middle years
    Given a TakeMortgage event from April 2024 to April 2054
    When the user views calendar year 2030
    Then a bar spans from January through December
    And both ends show continuation arrows

  Scenario: Repaid loan bar ends at repayment month
    Given a TakePersonalLoan event from January 2026 to December 2030
    And a RepayLoan event fully paying it off in June 2026
    When the user views calendar year 2026
    Then the bar spans from January through June
    And the bar label appears struck through

  Rule: Month detail sections list events sorted by date

  Scenario: Events within a month are sorted by day
    Given April 2026 has events on day 1 and day 15
    When the user views the April detail section
    Then events appear sorted: day 1 first, day 15 second

  Scenario: Empty months between event months are collapsed
    Given events exist in April and September 2026 only
    Then the detail area shows "April 2026" and "September 2026" sections
    And a collapsed label "No events in May – August" appears between them

  Scenario: Event card shows type-specific summary
    Given a TakeMortgage event "My Flat" on April 1, 2026
    Then its card shows:
      | line          | content                           |
      | title         | Take Mortgage — "My Flat"         |
      | detail line 1 | Loan: 5,000,000 CZK · 5.5% · 30y |
      | detail line 2 | Flat: 6,000,000 CZK · 3% growth  |
      | detail line 3 | Payment: 22,684 CZK/mo            |
      | status        | ACTIVE                            |

  Rule: Archived events are blurred with a toggle to hide

  Scenario: Archived events appear dimmed
    Given an archived AddExpense event "Old Rent" on April 18
    And "Show archived" is checked
    Then "Old Rent" appears in the April section at reduced opacity
    And its status badge shows ARCHIVED

  Scenario: Toggle hides archived events entirely
    Given an archived event exists in April
    When the user unchecks "Show archived"
    Then the archived event is hidden
    And the April event count updates accordingly

  Scenario: Archived toggle is checked by default
    When the user opens the calendar page
    Then the "Show archived" checkbox is checked

  Rule: Any event is editable from the calendar regardless of age

  Scenario: Click any active event to edit
    Given an active event created more than 12 hours ago
    When the user clicks the event card in the calendar
    Then the edit dialog opens pre-filled with the event data
    And the user can modify and save

  Scenario: Click an archived event to view
    Given an archived event exists
    When the user clicks the archived event card
    Then a read-only detail view opens
    And archive/restore actions are available

  Rule: Event cards are color-coded by type

  Scenario: Each event type has a distinct color indicator
    Then event cards show a colored indicator by type:
      | type               | color  |
      | AddIncome          | green  |
      | AddExpense         | red    |
      | AddAsset           | blue   |
      | BuyAsset           | blue   |
      | TakeMortgage       | orange |
      | TakePersonalLoan   | orange |
      | RepayLoan          | purple |
      | ManualCorrection   | gray   |
