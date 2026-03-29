import type { FinanceEvent } from '@/types/events';

function ownsEntity(e: FinanceEvent, entityId: string): boolean {
  switch (e.type) {
    case 'take_mortgage':
      return (
        e.mortgage.id === entityId ||
        e.flat.id === entityId ||
        e.expense.id === entityId ||
        (e.rental && e.income.id === entityId)
      );
    case 'take_personal_loan':
      return (
        e.loan.id === entityId ||
        e.cash.id === entityId ||
        e.expense.id === entityId
      );
    case 'add_income':
      return e.income.id === entityId;
    case 'add_expense':
      return e.expense.id === entityId;
    case 'manual_correction':
      return false;
  }
}

export function findOwnerEvent(
  events: FinanceEvent[],
  entityId: string,
): FinanceEvent | undefined {
  return events.find((e) => ownsEntity(e, entityId));
}

export function isStandaloneIncome(
  events: FinanceEvent[],
  incomeId: string,
): boolean {
  const owner = findOwnerEvent(events, incomeId);
  return owner?.type === 'add_income';
}

export function isStandaloneExpense(
  events: FinanceEvent[],
  expenseId: string,
): boolean {
  const owner = findOwnerEvent(events, expenseId);
  return owner?.type === 'add_expense';
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const EDIT_WINDOW_MS = 12 * 60 * 60 * 1000;

export function isEventEditable(event: FinanceEvent): boolean {
  if (!event.createdAt) return false;
  return Date.now() - new Date(event.createdAt).getTime() < EDIT_WINDOW_MS;
}
