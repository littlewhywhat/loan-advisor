Feature: Archive, Restore, and Delete events

  Rule: Events are editable within 12 hours of creation

  Scenario: Archive an active event within edit window
    Given an event with status ACTIVE exists
    And the event was created less than 12 hours ago
    When the user archives the event
    And the user confirms
    Then the event status changes to ARCHIVED
    And all entities owned by the event are excluded from current state
    And state is recomputed from remaining ACTIVE events

  Scenario: Cannot archive an event outside edit window
    Given an event with status ACTIVE exists
    And the event was created more than 12 hours ago
    Then the archive action is not available

  Scenario: Restore an archived event
    Given an event with status ARCHIVED exists
    When the user restores the event
    And the user confirms
    Then the event status changes to ACTIVE
    And state is recomputed including the restored event

  Scenario: Delete an archived event
    Given an event with status ARCHIVED exists
    When the user deletes the event
    And the user confirms
    Then the event and all its owned entities are permanently removed
