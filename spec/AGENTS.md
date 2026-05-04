# Spec

Keep diagrams in sync with TypeScript domain types.

## Diagram ↔ Code Mapping

| Diagram | TypeScript Module | What to sync |
|---------|-------------------|--------------|
| `diagram/entities.puml` | `src/types/events.ts` (lines 1–50: `Currency`, `Frequency`, `MoneyAmount`, `Income`, `Expense`, `Asset`, `Liability`) | Enums, value objects, entity discriminated unions. Add/remove entity kinds when code changes. |
| `diagram/events.puml` | `src/types/events.ts` (lines 51–167: `EventStatus`, `EventBase`, event types, `FinanceEvent`, `EventStore`) | Event discriminated union. Add/remove event types when domain actions change. Update event payload fields. |
| `diagram/strategy.puml` | `src/types/events.ts` (lines 148–159: `Strategy`, `StrategyLibrary`) | Strategy sandbox structure. Update when strategy meta-fields change (e.g., new config options). |

## When to Update

- **Adding an event type:** Update `diagram/events.puml` + corresponding `.feature` in `spec/features/` (or mark as draft if not user-facing yet).
- **Changing entity structure:** Update `diagram/entities.puml` + affected features that reference the entity.
- **Renaming or removing types:** Update all three diagrams if the type appears in any; update affected feature files.

See `.cursor/rules/spec-sync.mdc` for the automated reminder flow.
