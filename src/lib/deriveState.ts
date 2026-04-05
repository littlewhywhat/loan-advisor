import type {
  Asset,
  DerivedState,
  EventStatus,
  Expense,
  FinanceEvent,
  Income,
  Liability,
} from '@/types/events';

function cloneAsset<T extends Asset>(a: T): T {
  return { ...a, value: { ...a.value } };
}

function cloneLiability<T extends Liability>(l: T): T {
  return { ...l, value: { ...l.value } };
}

function cloneIncome(i: Income): Income {
  return { ...i, amount: { ...i.amount } };
}

function cloneExpense(e: Expense): Expense {
  return { ...e, amount: { ...e.amount } };
}

export function emptyState(): DerivedState {
  return { assets: [], liabilities: [], incomes: [], expenses: [] };
}

export function cloneState(state: DerivedState): DerivedState {
  return {
    assets: state.assets.map(cloneAsset),
    liabilities: state.liabilities.map(cloneLiability),
    incomes: state.incomes.map(cloneIncome),
    expenses: state.expenses.map(cloneExpense),
  };
}

export function applyEvents(
  state: DerivedState,
  events: FinanceEvent[],
): DerivedState {
  const { assets, liabilities, incomes, expenses } = cloneState(state);

  for (const event of events) {
    switch (event.type) {
      case 'take_mortgage': {
        liabilities.push(cloneLiability(event.mortgage));
        assets.push(cloneAsset(event.flat));
        expenses.push(cloneExpense(event.expense));
        if (event.rental) incomes.push(cloneIncome(event.income));
        if (event.allocations) {
          for (const alloc of event.allocations) {
            const cash = assets.find((a) => a.id === alloc.cashAssetId);
            if (cash) {
              cash.value = {
                ...cash.value,
                amount: Math.max(0, cash.value.amount - alloc.amount.amount),
              };
            }
          }
        }
        break;
      }
      case 'take_personal_loan': {
        liabilities.push(cloneLiability(event.loan));
        assets.push(cloneAsset(event.cash));
        expenses.push(cloneExpense(event.expense));
        break;
      }
      case 'add_asset': {
        assets.push(cloneAsset(event.asset));
        break;
      }
      case 'buy_asset': {
        assets.push(cloneAsset(event.asset));
        for (const alloc of event.allocations) {
          const cash = assets.find((a) => a.id === alloc.cashAssetId);
          if (cash) {
            cash.value = {
              ...cash.value,
              amount: Math.max(0, cash.value.amount - alloc.amount.amount),
            };
          }
        }
        if (event.removeExpenseId) {
          const idx = expenses.findIndex((e) => e.id === event.removeExpenseId);
          if (idx !== -1) expenses.splice(idx, 1);
        }
        if (event.newExpense) {
          expenses.push(cloneExpense(event.newExpense));
        }
        break;
      }
      case 'add_income': {
        incomes.push(cloneIncome(event.income));
        break;
      }
      case 'add_expense': {
        expenses.push(cloneExpense(event.expense));
        break;
      }
      case 'repay_loan': {
        const liability = liabilities.find((l) => l.id === event.liabilityId);
        if (liability) {
          liability.value = event.newPrincipal;
          liability.startDate = event.newStartDate;
          liability.endDate = event.newEndDate;
        }
        const expense = expenses.find((e) => e.id === event.expenseId);
        if (expense) {
          expense.amount = event.newMonthlyPayment;
        }
        if (event.allocations) {
          for (const alloc of event.allocations) {
            const cash = assets.find((a) => a.id === alloc.cashAssetId);
            if (cash) {
              cash.value = {
                ...cash.value,
                amount: Math.max(0, cash.value.amount - alloc.amount.amount),
              };
            }
          }
        }
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

export function deriveState(
  events: FinanceEvent[],
  status: EventStatus = 'active',
): DerivedState {
  const active = events
    .filter((e) => e.status === status)
    .sort((a, b) => a.date.localeCompare(b.date));
  return applyEvents(emptyState(), active);
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
