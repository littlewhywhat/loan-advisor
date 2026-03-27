import { useEffect, useState } from 'react';
import { SEED_STORE } from '@/lib/seedData';
import type {
  Asset,
  AssetInput,
  AssetUpdate,
  Currency,
  Expense,
  ExpenseUpdate,
  FinanceStore,
  Income,
  IncomeInput,
  IncomeUpdate,
  Liability,
  LiabilityInput,
  LiabilityUpdate,
} from '@/types/finance';

const MODE_KEY = 'finance-mode';
const STORAGE_KEY_DEV = 'personal-finance-dev';
const STORAGE_KEY_PROD = 'personal-finance-prod';

export type AppMode = 'dev' | 'prod';

const EMPTY_STORE: FinanceStore = {
  currency: 'CZK',
  assets: [],
  liabilities: [],
  incomes: [],
  expenses: [],
};

function loadMode(): AppMode {
  const saved = localStorage.getItem(MODE_KEY);
  if (saved === 'prod') return 'prod';
  return 'dev';
}

function storageKey(mode: AppMode): string {
  return mode === 'dev' ? STORAGE_KEY_DEV : STORAGE_KEY_PROD;
}

function loadStore(mode: AppMode): FinanceStore {
  const key = storageKey(mode);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.currency) return parsed;
    }
  } catch {}
  if (mode === 'dev') return structuredClone(SEED_STORE);
  return { ...EMPTY_STORE };
}

function uid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function stamp<T>(
  input: T,
  id?: string,
): T & { id: string; createdAt: string; updatedAt: string } {
  const ts = now();
  return { ...input, id: id ?? uid(), createdAt: ts, updatedAt: ts };
}

function buildExpenseForLiability(
  input: LiabilityInput,
  liabilityId: string,
  fallbackCurrency: string,
): Expense {
  const ts = now();
  if (input.type === 'loan') {
    return {
      id: uid(),
      name: `${input.name} Payment`,
      category: 'liability',
      amount: input.monthlyPayment,
      frequency: 'monthly',
      isEssential: true,
      currency: fallbackCurrency,
      linkedLiabilityId: liabilityId,
      createdAt: ts,
      updatedAt: ts,
    };
  }
  return {
    id: uid(),
    name: input.name,
    category: 'ownership',
    amount: input.amount,
    frequency: input.frequency,
    isEssential: true,
    currency: input.currency,
    linkedLiabilityId: liabilityId,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function useFinanceState() {
  const [mode, setModeState] = useState<AppMode>(loadMode);
  const [store, setState] = useState<FinanceStore>(() => loadStore(mode));

  useEffect(() => {
    localStorage.setItem(storageKey(mode), JSON.stringify(store));
  }, [store, mode]);

  const setMode = (next: AppMode) => {
    localStorage.setItem(MODE_KEY, next);
    setModeState(next);
    setState(loadStore(next));
  };

  const setCurrency = (currency: Currency) =>
    setState((prev) => ({ ...prev, currency }));

  const addAsset = (input: AssetInput): string => {
    const id = uid();
    setState((prev) => ({
      ...prev,
      assets: [...prev.assets, stamp(input, id) as Asset],
    }));
    return id;
  };

  const updateAsset = (id: string, updates: AssetUpdate) =>
    setState((prev) => ({
      ...prev,
      assets: prev.assets.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: now() } : a,
      ),
    }));

  const removeAsset = (id: string) =>
    setState((prev) => ({
      ...prev,
      assets: prev.assets.filter((a) => a.id !== id),
    }));

  const addLiability = (input: LiabilityInput): string => {
    const id = uid();
    setState((prev) => {
      const liability = stamp(input, id) as Liability;
      const expense = buildExpenseForLiability(input, id, prev.currency);
      return {
        ...prev,
        liabilities: [...prev.liabilities, liability],
        expenses: [...prev.expenses, expense],
      };
    });
    return id;
  };

  const updateLiability = (id: string, updates: LiabilityUpdate) =>
    setState((prev) => {
      const liabilities = prev.liabilities.map((l) =>
        l.id === id ? ({ ...l, ...updates, updatedAt: now() } as Liability) : l,
      );

      const updated = liabilities.find((l) => l.id === id);
      let expenses = prev.expenses;
      if (updated) {
        const ts = now();
        expenses = prev.expenses.map((e) => {
          if (e.linkedLiabilityId !== id) return e;
          if (updated.type === 'loan') {
            return {
              ...e,
              name: `${updated.name} Payment`,
              amount: updated.monthlyPayment,
              frequency: 'monthly' as const,
              updatedAt: ts,
            };
          }
          return {
            ...e,
            name: updated.name,
            amount: updated.amount,
            frequency: updated.frequency,
            updatedAt: ts,
          };
        });
      }

      return { ...prev, liabilities, expenses };
    });

  const removeLiability = (id: string) =>
    setState((prev) => ({
      ...prev,
      liabilities: prev.liabilities.filter((l) => l.id !== id),
      expenses: prev.expenses.filter((e) => e.linkedLiabilityId !== id),
    }));

  const addIncome = (input: IncomeInput): string => {
    const id = uid();
    setState((prev) => ({
      ...prev,
      incomes: [...prev.incomes, stamp(input, id) as Income],
    }));
    return id;
  };

  const updateIncome = (id: string, updates: IncomeUpdate) =>
    setState((prev) => ({
      ...prev,
      incomes: prev.incomes.map((i) =>
        i.id === id ? { ...i, ...updates, updatedAt: now() } : i,
      ),
    }));

  const removeIncome = (id: string) =>
    setState((prev) => ({
      ...prev,
      incomes: prev.incomes.filter((i) => i.id !== id),
    }));

  const addExpense = (input: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) =>
    setState((prev) => ({
      ...prev,
      expenses: [...prev.expenses, stamp(input) as Expense],
    }));

  const updateExpense = (id: string, updates: ExpenseUpdate) =>
    setState((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) =>
        e.id === id ? { ...e, ...updates, updatedAt: now() } : e,
      ),
    }));

  const removeExpense = (id: string) =>
    setState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));

  return {
    store,
    mode,
    setMode,
    setCurrency,
    addAsset,
    updateAsset,
    removeAsset,
    addLiability,
    updateLiability,
    removeLiability,
    addIncome,
    updateIncome,
    removeIncome,
    addExpense,
    updateExpense,
    removeExpense,
  };
}
