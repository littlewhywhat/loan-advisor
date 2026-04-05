import { applyEvents, deriveState } from '@/lib/deriveState';
import { toMonthly } from '@/lib/format';
import {
  elapsedMonths,
  monthlyPaymentFromMonths,
  monthsBetween,
  remainingBalance,
} from '@/lib/loanCalc';
import type {
  DerivedState,
  FinanceEvent,
  NewEventInput,
  Strategy,
} from '@/types/events';

export type SimulatorConfig = {
  targetMonth: number;
  targetYear: number;
  cashReserveGrowthRate: number;
};

export type AssetSnapshot = {
  id: string;
  name: string;
  kind: 'flat' | 'cash';
  value: number;
  isStrategy?: boolean;
};

export type LiabilitySnapshot = {
  id: string;
  name: string;
  kind: 'loan' | 'mortgage';
  balance: number;
  isStrategy?: boolean;
};

export type IncomeLineItem = {
  id: string;
  name: string;
  monthlyAmount: number;
  isStrategy?: boolean;
};

export type ExpenseLineItem = {
  id: string;
  name: string;
  monthlyAmount: number;
  active: boolean;
  isStrategy?: boolean;
};

export type MonthSnapshot = {
  month: number;
  year: number;
  monthIndex: number;
  totalIncome: number;
  totalExpenses: number;
  cashFlow: number;
  totalAssets: number;
  cashReserve: number;
  totalLiabilities: number;
  accumulatedDeficit: number;
  netWorth: number;
  assets: AssetSnapshot[];
  liabilities: LiabilitySnapshot[];
  incomes: IncomeLineItem[];
  expenses: ExpenseLineItem[];
};

export type SimulationResult = {
  baseline: MonthSnapshot[];
  strategy: MonthSnapshot[] | null;
};

type LiabilityRuntime = {
  balance: number;
  monthlyPayment: number;
  linkedExpenseId: string | null;
  paidOff: boolean;
};

type SimState = {
  derived: DerivedState;
  liabilityRuntime: Map<string, LiabilityRuntime>;
  cashReserve: number;
  accumulatedDeficit: number;
  paidOffExpenseIds: Set<string>;
};

type ScheduledEvent = {
  month: number;
  year: number;
  event: FinanceEvent;
};

function buildLiabilityExpenseMap(events: FinanceEvent[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const event of events) {
    if (event.status !== 'active') continue;
    if (event.type === 'take_mortgage') {
      map.set(event.mortgage.id, event.expense.id);
    } else if (event.type === 'take_personal_loan') {
      map.set(event.loan.id, event.expense.id);
    }
  }
  return map;
}

function computeLiabilityRuntime(
  derived: DerivedState,
  liabilityExpenseMap: Map<string, string>,
): Map<string, LiabilityRuntime> {
  const runtime = new Map<string, LiabilityRuntime>();
  for (const l of derived.liabilities) {
    const totalMonths = monthsBetween(l.startDate, l.endDate);
    const mp = monthlyPaymentFromMonths(
      l.value.amount,
      l.interestRate,
      totalMonths,
    );
    const elapsed = elapsedMonths(l.startDate);
    const balance = remainingBalance(
      l.value.amount,
      l.interestRate,
      mp,
      elapsed,
    );
    runtime.set(l.id, {
      balance,
      monthlyPayment: mp,
      linkedExpenseId: liabilityExpenseMap.get(l.id) ?? null,
      paidOff: balance <= 0,
    });
  }
  return runtime;
}

function initSimState(
  events: FinanceEvent[],
  liabilityExpenseMap: Map<string, string>,
): SimState {
  const derived = deriveState(events);
  return {
    derived,
    liabilityRuntime: computeLiabilityRuntime(derived, liabilityExpenseMap),
    cashReserve: 0,
    accumulatedDeficit: 0,
    paidOffExpenseIds: new Set(),
  };
}

function injectScheduledEvents(
  state: SimState,
  events: FinanceEvent[],
  liabilityExpenseMap: Map<string, string>,
): void {
  const prevLiabilityIds = new Set(state.derived.liabilities.map((l) => l.id));
  state.derived = applyEvents(state.derived, events);

  for (const l of state.derived.liabilities) {
    if (prevLiabilityIds.has(l.id)) continue;
    const totalMonths = monthsBetween(l.startDate, l.endDate);
    const mp = monthlyPaymentFromMonths(
      l.value.amount,
      l.interestRate,
      totalMonths,
    );
    state.liabilityRuntime.set(l.id, {
      balance: l.value.amount,
      monthlyPayment: mp,
      linkedExpenseId: liabilityExpenseMap.get(l.id) ?? null,
      paidOff: false,
    });
  }

  for (const event of events) {
    if (
      event.type === 'take_mortgage' &&
      event.mortgage.downPayment.amount > 0
    ) {
      const allocatedTotal = (event.allocations ?? []).reduce(
        (sum, a) => sum + a.amount.amount,
        0,
      );
      const fromCashReserve =
        event.mortgage.downPayment.amount - allocatedTotal;
      if (fromCashReserve > 0) {
        state.cashReserve = Math.max(0, state.cashReserve - fromCashReserve);
      }
    }
    if (event.type !== 'repay_loan') continue;
    const allocatedTotal = (event.allocations ?? []).reduce(
      (sum, a) => sum + a.amount.amount,
      0,
    );
    const fromCashReserve = event.repaymentAmount.amount - allocatedTotal;
    if (fromCashReserve > 0) {
      state.cashReserve = Math.max(0, state.cashReserve - fromCashReserve);
    }
    const runtime = state.liabilityRuntime.get(event.liabilityId);
    if (runtime) {
      runtime.balance = event.newPrincipal.amount;
      runtime.monthlyPayment = event.newMonthlyPayment.amount;
      if (runtime.balance <= 0) {
        runtime.paidOff = true;
        if (runtime.linkedExpenseId)
          state.paidOffExpenseIds.add(runtime.linkedExpenseId);
      }
    }
  }
}

function advanceOneMonth(state: SimState, cashReserveGrowthRate: number): void {
  for (const l of state.derived.liabilities) {
    const runtime = state.liabilityRuntime.get(l.id);
    if (!runtime || runtime.paidOff) continue;
    const r = l.interestRate / 12;
    const interest = runtime.balance * r;
    const principalPortion = Math.min(
      runtime.monthlyPayment - interest,
      runtime.balance,
    );
    runtime.balance = Math.max(0, runtime.balance - principalPortion);
    if (runtime.balance <= 0) {
      runtime.paidOff = true;
      if (runtime.linkedExpenseId)
        state.paidOffExpenseIds.add(runtime.linkedExpenseId);
    }
  }

  const totalIncome = state.derived.incomes.reduce(
    (sum, inc) => sum + toMonthly(inc.amount.amount, inc.frequency),
    0,
  );
  const totalExpenses = state.derived.expenses
    .filter((e) => !state.paidOffExpenseIds.has(e.id))
    .reduce((sum, exp) => sum + toMonthly(exp.amount.amount, exp.frequency), 0);
  const cashFlow = totalIncome - totalExpenses;

  if (cashFlow >= 0) {
    state.cashReserve += cashFlow;
  } else {
    state.accumulatedDeficit += Math.abs(cashFlow);
  }

  for (const a of state.derived.assets) {
    a.value.amount *= 1 + a.growthRate / 12;
  }

  state.cashReserve *= 1 + cashReserveGrowthRate / 12;
}

function buildSnapshot(
  state: SimState,
  month: number,
  year: number,
  monthIndex: number,
  strategyEntityIds: Set<string>,
): MonthSnapshot {
  const totalIncome = state.derived.incomes.reduce(
    (sum, inc) => sum + toMonthly(inc.amount.amount, inc.frequency),
    0,
  );
  const totalExpenses = state.derived.expenses
    .filter((e) => !state.paidOffExpenseIds.has(e.id))
    .reduce((sum, exp) => sum + toMonthly(exp.amount.amount, exp.frequency), 0);
  const cashFlow = totalIncome - totalExpenses;
  const totalAssets = state.derived.assets.reduce(
    (sum, a) => sum + a.value.amount,
    0,
  );
  const totalLiabilities = Array.from(state.liabilityRuntime.values()).reduce(
    (sum, r) => sum + r.balance,
    0,
  );
  const netWorth =
    totalAssets +
    state.cashReserve -
    totalLiabilities -
    state.accumulatedDeficit;

  return {
    month,
    year,
    monthIndex,
    totalIncome: Math.round(totalIncome),
    totalExpenses: Math.round(totalExpenses),
    cashFlow: Math.round(cashFlow),
    totalAssets: Math.round(totalAssets),
    cashReserve: Math.round(state.cashReserve),
    totalLiabilities: Math.round(totalLiabilities),
    accumulatedDeficit: Math.round(state.accumulatedDeficit),
    netWorth: Math.round(netWorth),
    assets: state.derived.assets.map((a) => ({
      id: a.id,
      name: a.name,
      kind: a.kind,
      value: Math.round(a.value.amount),
      isStrategy: strategyEntityIds.has(a.id) || undefined,
    })),
    liabilities: state.derived.liabilities.map((l) => {
      const runtime = state.liabilityRuntime.get(l.id);
      return {
        id: l.id,
        name: l.name,
        kind: l.kind,
        balance: Math.round(runtime?.balance ?? 0),
        isStrategy: strategyEntityIds.has(l.id) || undefined,
      };
    }),
    incomes: state.derived.incomes.map((inc) => ({
      id: inc.id,
      name: inc.name,
      monthlyAmount: Math.round(toMonthly(inc.amount.amount, inc.frequency)),
      isStrategy: strategyEntityIds.has(inc.id) || undefined,
    })),
    expenses: state.derived.expenses.map((exp) => ({
      id: exp.id,
      name: exp.name,
      monthlyAmount: Math.round(toMonthly(exp.amount.amount, exp.frequency)),
      active: !state.paidOffExpenseIds.has(exp.id),
      isStrategy: strategyEntityIds.has(exp.id) || undefined,
    })),
  };
}

function buildScheduleMap(
  events: ScheduledEvent[],
): Map<string, FinanceEvent[]> {
  const map = new Map<string, FinanceEvent[]>();
  for (const se of events) {
    const key = `${se.year}-${se.month}`;
    const list = map.get(key) ?? [];
    list.push(se.event);
    map.set(key, list);
  }
  return map;
}

function projectSnapshots(
  events: FinanceEvent[],
  config: SimulatorConfig,
  immediateStrategyEvents: FinanceEvent[] = [],
  scheduledEvents: ScheduledEvent[] = [],
  strategyEntityIds: Set<string> = new Set(),
): MonthSnapshot[] {
  const allEvents = [
    ...events,
    ...immediateStrategyEvents,
    ...scheduledEvents.map((se) => se.event),
  ];
  const liabilityExpenseMap = buildLiabilityExpenseMap(allEvents);
  const scheduleMap = buildScheduleMap(scheduledEvents);

  const now = new Date();
  const startMonth = now.getMonth() + 1;
  const startYear = now.getFullYear();
  const totalMonths =
    (config.targetYear - startYear) * 12 + (config.targetMonth - startMonth);

  if (totalMonths <= 0) return [];

  const state = initSimState(events, liabilityExpenseMap);

  if (immediateStrategyEvents.length > 0) {
    injectScheduledEvents(state, immediateStrategyEvents, liabilityExpenseMap);
  }

  const snapshots: MonthSnapshot[] = [];

  for (let i = 1; i <= totalMonths; i++) {
    const m = ((startMonth - 1 + i) % 12) + 1;
    const y = startYear + Math.floor((startMonth - 1 + i) / 12);

    const due = scheduleMap.get(`${y}-${m}`);
    if (due) {
      injectScheduledEvents(state, due, liabilityExpenseMap);
    }

    advanceOneMonth(state, config.cashReserveGrowthRate);
    snapshots.push(buildSnapshot(state, m, y, i, strategyEntityIds));
  }

  return snapshots;
}

function collectEntityIds(event: FinanceEvent): string[] {
  switch (event.type) {
    case 'add_income':
      return [event.income.id];
    case 'add_expense':
      return [event.expense.id];
    case 'add_asset':
      return [event.asset.id];
    case 'buy_asset': {
      const ids = [event.asset.id];
      if (event.newExpense) ids.push(event.newExpense.id);
      return ids;
    }
    case 'take_mortgage': {
      const ids = [event.mortgage.id, event.flat.id, event.expense.id];
      if (event.rental) ids.push(event.income.id);
      return ids;
    }
    case 'take_personal_loan':
      return [event.loan.id, event.cash.id, event.expense.id];
    case 'repay_loan':
      return [];
    case 'manual_correction':
      return [];
  }
}

export function runSimulation(
  events: FinanceEvent[],
  config: SimulatorConfig,
  strategyInputs: NewEventInput[] = [],
): SimulationResult {
  const baseline = projectSnapshots(events, config);

  if (strategyInputs.length === 0) {
    return { baseline, strategy: null };
  }

  const now = new Date();
  const startMonth = now.getMonth() + 1;
  const startYear = now.getFullYear();

  const strategyAsEvents = strategyInputs.map((e) => ({
    ...e,
    id: crypto.randomUUID(),
    status: 'active' as const,
  })) as FinanceEvent[];

  const strategyEntityIds = new Set(strategyAsEvents.flatMap(collectEntityIds));

  const immediateEvents: FinanceEvent[] = [];
  const scheduledEvents: ScheduledEvent[] = [];

  for (const e of strategyAsEvents) {
    const d = new Date(e.date);
    const eMonth = d.getMonth() + 1;
    const eYear = d.getFullYear();
    if (eYear < startYear || (eYear === startYear && eMonth <= startMonth)) {
      immediateEvents.push(e);
    } else {
      scheduledEvents.push({ month: eMonth, year: eYear, event: e });
    }
  }

  const strategy = projectSnapshots(
    events,
    config,
    immediateEvents,
    scheduledEvents,
    strategyEntityIds,
  );

  return { baseline, strategy };
}

export type StrategyProjection = {
  id: string;
  name: string;
  snapshots: MonthSnapshot[];
};

export type MultiStrategyResult = {
  baseline: MonthSnapshot[];
  strategies: StrategyProjection[];
};

export function runMultiStrategySimulation(
  events: FinanceEvent[],
  config: SimulatorConfig,
  strategies: Strategy[],
): MultiStrategyResult {
  const baseline = projectSnapshots(events, config);

  const projections: StrategyProjection[] = [];
  for (const s of strategies) {
    if (s.events.length === 0) continue;
    const result = runSimulation(events, config, s.events);
    if (result.strategy) {
      projections.push({ id: s.id, name: s.name, snapshots: result.strategy });
    }
  }

  return { baseline, strategies: projections };
}
