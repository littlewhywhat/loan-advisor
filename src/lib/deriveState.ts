import type {
  Asset,
  DerivedState,
  EventStatus,
  Expense,
  FinanceEvent,
  Income,
  Liability,
} from '@/types/events';

export function deriveState(
  events: FinanceEvent[],
  status: EventStatus = 'active',
): DerivedState {
  const active = events
    .filter((e) => e.status === status)
    .sort((a, b) => a.date.localeCompare(b.date));

  const assets: Asset[] = [];
  const liabilities: Liability[] = [];
  const incomes: Income[] = [];
  const expenses: Expense[] = [];

  for (const event of active) {
    switch (event.type) {
      case 'take_mortgage': {
        liabilities.push(event.mortgage);
        assets.push(event.flat);
        expenses.push(event.expense);
        if (event.rental) incomes.push(event.income);
        break;
      }
      case 'take_personal_loan': {
        liabilities.push(event.loan);
        assets.push(event.cash);
        expenses.push(event.expense);
        break;
      }
      case 'add_asset': {
        assets.push(event.asset);
        break;
      }
      case 'add_income': {
        incomes.push(event.income);
        break;
      }
      case 'add_expense': {
        expenses.push(event.expense);
        break;
      }
      case 'manual_correction': {
        applyCorrection(event.changes, {
          assets,
          liabilities,
          incomes,
          expenses,
        });
        break;
      }
    }
  }

  return { assets, liabilities, incomes, expenses };
}

type EntityMap = {
  assets: Asset[];
  liabilities: Liability[];
  incomes: Income[];
  expenses: Expense[];
};

function applyCorrection(
  changes: Record<string, unknown>,
  state: EntityMap,
): void {
  for (const [collection, patches] of Object.entries(changes)) {
    if (!(collection in state)) continue;
    const arr = state[collection as keyof EntityMap];
    const patchMap = patches as Record<string, Record<string, unknown>>;
    for (let i = 0; i < arr.length; i++) {
      const entity = arr[i];
      const patch = patchMap[entity.id];
      if (patch) {
        (arr as unknown[])[i] = deepMerge(entity, patch);
      }
    }
  }
}

function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>,
): T {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = (target as Record<string, unknown>)[key];
    if (
      srcVal !== null &&
      typeof srcVal === 'object' &&
      !Array.isArray(srcVal) &&
      tgtVal !== null &&
      typeof tgtVal === 'object' &&
      !Array.isArray(tgtVal)
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        tgtVal as Record<string, unknown>,
        srcVal as Record<string, unknown>,
      );
    } else {
      (result as Record<string, unknown>)[key] = srcVal;
    }
  }
  return result;
}
