Feature: Edit event entities

  Rule: Events are editable within 12 hours of creation

  Scenario: Edit a standalone entity within edit window
    Given an event with status ACTIVE exists
    And the event was created less than 12 hours ago
    When the user edits an entity owned by the event
    And the user confirms
    Then the event is updated with the new entity values

  Scenario: Cannot edit an event outside edit window
    Given an event with status ACTIVE exists
    And the event was created more than 12 hours ago
    Then the edit action is not available
