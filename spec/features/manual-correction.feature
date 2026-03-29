Feature: Manual Correction

  Scenario: Enter manual edit mode and make corrections
    Given the user has a current state with ACTIVE events
    When the user enters manual edit mode
    Then future-dated events are locked from applying
    And the user can modify entity values directly

  Scenario: Save manual corrections
    Given the user is in manual edit mode
    And the user has modified some entity values
    When the user exits manual edit mode
    Then a ManualCorrection event is created with the changes as payload
    And the event is inserted at current date with status ACTIVE
    And future-dated events are unlocked and resume applying in date order
