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
    case 'add_asset':
      return e.asset.id === entityId;
    case 'buy_asset':
      return (
        e.asset.id === entityId ||
        (!!e.newExpense && e.newExpense.id === entityId)
      );
    case 'add_income':
      return e.income.id === entityId;
    case 'add_expense':
      return e.expense.id === entityId;
    case 'repay_loan':
      return false;
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

export function isStandaloneAsset(
  events: FinanceEvent[],
  assetId: string,
): boolean {
  const owner = findOwnerEvent(events, assetId);
  return owner?.type === 'add_asset';
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

export function ownedEntityNames(event: FinanceEvent): string[] {
  switch (event.type) {
    case 'take_mortgage': {
      const names = [event.mortgage.name, event.flat.name, event.expense.name];
      if (event.rental) names.push(event.income.name);
      return names;
    }
    case 'take_personal_loan':
      return [event.loan.name, event.cash.name, event.expense.name];
    case 'add_asset':
      return [event.asset.name];
    case 'buy_asset': {
      const names = [event.asset.name];
      if (event.newExpense) names.push(event.newExpense.name);
      return names;
    }
    case 'add_income':
      return [event.income.name];
    case 'add_expense':
      return [event.expense.name];
    case 'repay_loan':
      return [];
    case 'manual_correction':
      return [];
  }
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const EDIT_WINDOW_MS = 12 * 60 * 60 * 1000;

export function isEventEditable(event: FinanceEvent): boolean {
  if (!event.createdAt) return false;
  return Date.now() - new Date(event.createdAt).getTime() < EDIT_WINDOW_MS;
}
