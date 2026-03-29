Feature: Archive, Restore, and Delete events

  Scenario: Archive a future-dated active event
    Given an event with status ACTIVE exists
    And the event date is after today
    When the user archives the event
    Then the event status changes to ARCHIVED
    And all entities owned by the event are excluded from current state
    And state is recomputed from remaining ACTIVE events

  Scenario: Restore an archived event
    Given an event with status ARCHIVED exists
    When the user restores the event
    Then the event status changes to ACTIVE
    And state is recomputed including the restored event

  Scenario: Delete an archived event
    Given an event with status ARCHIVED exists
    When the user deletes the event
    Then the event and all its owned entities are permanently removed
