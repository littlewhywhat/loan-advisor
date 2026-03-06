import { useCallback, useState } from 'react';

export type CalculationInputs = {
  expense: number;
  savings: number;
  loanRate: number;
  loanYears: number;
};

export type Calculation = {
  id: string;
  name: string;
  locked: boolean;
  inputs: CalculationInputs;
};

type State = {
  activeId: string;
  calculations: Calculation[];
};

const STORAGE_KEY = 'loan-advisor-calculations';

const DEFAULT_INPUTS: CalculationInputs = {
  expense: 5000,
  savings: 5000,
  loanRate: 0.05,
  loanYears: 10,
};

function generateId(): string {
  return crypto.randomUUID();
}

function createCalculation(name: string): Calculation {
  return {
    id: generateId(),
    name,
    locked: false,
    inputs: { ...DEFAULT_INPUTS },
  };
}

function nextName(calculations: Calculation[]): string {
  let max = 0;
  for (const c of calculations) {
    const match = c.name.match(/^Scenario (\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `Scenario ${max + 1}`;
}

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.calculations?.length > 0) return parsed;
    }
  } catch {}
  const first = createCalculation('Scenario 1');
  return { activeId: first.id, calculations: [first] };
}

function saveState(state: State): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useCalculations() {
  const [state, setStateRaw] = useState<State>(loadState);

  const setState = useCallback((updater: (prev: State) => State) => {
    setStateRaw((prev) => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  const active =
    state.calculations.find((c) => c.id === state.activeId) ??
    state.calculations[0];

  const setActiveId = useCallback(
    (id: string) => {
      setState((prev) => ({ ...prev, activeId: id }));
    },
    [setState],
  );

  const addCalculation = useCallback(() => {
    setState((prev) => {
      const calc = createCalculation(nextName(prev.calculations));
      return {
        activeId: calc.id,
        calculations: [...prev.calculations, calc],
      };
    });
  }, [setState]);

  const removeCalculation = useCallback(
    (id: string) => {
      setState((prev) => {
        if (prev.calculations.length <= 1) return prev;
        const filtered = prev.calculations.filter((c) => c.id !== id);
        const newActiveId =
          prev.activeId === id ? filtered[0].id : prev.activeId;
        return { activeId: newActiveId, calculations: filtered };
      });
    },
    [setState],
  );

  const updateInputs = useCallback(
    (id: string, partial: Partial<CalculationInputs>) => {
      setState((prev) => ({
        ...prev,
        calculations: prev.calculations.map((c) =>
          c.id === id ? { ...c, inputs: { ...c.inputs, ...partial } } : c,
        ),
      }));
    },
    [setState],
  );

  const toggleLock = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        calculations: prev.calculations.map((c) =>
          c.id === id ? { ...c, locked: !c.locked } : c,
        ),
      }));
    },
    [setState],
  );

  const rename = useCallback(
    (id: string, name: string) => {
      setState((prev) => ({
        ...prev,
        calculations: prev.calculations.map((c) =>
          c.id === id ? { ...c, name } : c,
        ),
      }));
    },
    [setState],
  );

  return {
    calculations: state.calculations,
    activeId: state.activeId,
    active,
    setActiveId,
    addCalculation,
    removeCalculation,
    updateInputs,
    toggleLock,
    rename,
  };
}
