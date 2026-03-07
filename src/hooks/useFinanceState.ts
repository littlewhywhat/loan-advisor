import { useEffect, useState } from 'react';
import type {
  Asset,
  AssetInput,
  AssetUpdate,
  Currency,
  Expense,
  ExpenseInput,
  ExpenseUpdate,
  FinanceStore,
  Income,
  IncomeInput,
  IncomeUpdate,
  Liability,
  LiabilityInput,
  LiabilityUpdate,
} from '@/types/finance';

const STORAGE_KEY = 'personal-finance';

const DEFAULT_STORE: FinanceStore = {
  currency: 'CZK',
  assets: [],
  liabilities: [],
  incomes: [],
  expenses: [],
};

function loadStore(): FinanceStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.currency) return parsed;
    }
  } catch {}
  return { ...DEFAULT_STORE };
}

function stamp<T>(
  input: T,
): T & { id: string; createdAt: string; updatedAt: string } {
  const now = new Date().toISOString();
  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
}

function now(): string {
  return new Date().toISOString();
}

export function useFinanceState() {
  const [store, setState] = useState<FinanceStore>(loadStore);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  const setCurrency = (currency: Currency) =>
    setState((prev) => ({ ...prev, currency }));

  const addAsset = (input: AssetInput) =>
    setState((prev) => ({
      ...prev,
      assets: [...prev.assets, stamp(input) as Asset],
    }));

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

  const addLiability = (input: LiabilityInput) =>
    setState((prev) => ({
      ...prev,
      liabilities: [...prev.liabilities, stamp(input) as Liability],
    }));

  const updateLiability = (id: string, updates: LiabilityUpdate) =>
    setState((prev) => ({
      ...prev,
      liabilities: prev.liabilities.map((l) =>
        l.id === id ? ({ ...l, ...updates, updatedAt: now() } as Liability) : l,
      ),
    }));

  const removeLiability = (id: string) =>
    setState((prev) => ({
      ...prev,
      liabilities: prev.liabilities.filter((l) => l.id !== id),
    }));

  const addIncome = (input: IncomeInput) =>
    setState((prev) => ({
      ...prev,
      incomes: [...prev.incomes, stamp(input) as Income],
    }));

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

  const addExpense = (input: ExpenseInput) =>
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
