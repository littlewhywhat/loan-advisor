import { toMonthly } from '@/lib/format';
import type { FinanceEvent, NewEventInput } from '@/types/events';
import { deriveState } from '@/lib/deriveState';

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

type AssetState = {
  id: string;
  name: string;
  kind: 'flat' | 'cash';
  value: number;
  growthRate: number;
  isStrategy: boolean;
};

type LiabilityState = {
  id: string;
  name: string;
  kind: 'loan' | 'mortgage';
  balance: number;
  interestRate: number;
  monthlyPayment: number;
  linkedExpenseId: string | null;
  paidOff: boolean;
  isStrategy: boolean;
};

type ScheduledEvent = {
  month: number;
  year: number;
  event: FinanceEvent;
};

type LoopState = {
  assetStates: AssetState[];
  liabilityStates: LiabilityState[];
  incomeItems: IncomeLineItem[];
  expenseItems: ExpenseLineItem[];
  paidOffExpenseIds: Set<string>;
  cashReserve: number;
  accumulatedDeficit: number;
};

function monthsBetween(startDate: string, endDate: string): number {
  const s = new Date(startDate);
  const e = new Date(endDate);
  return (
    (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
  );
}

function computeMonthlyPayment(
  principal: number,
  annualRate: number,
  totalMonths: number,
): number {
  if (totalMonths <= 0 || principal <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return principal / totalMonths;
  return (
    (principal * r * (1 + r) ** totalMonths) / ((1 + r) ** totalMonths - 1)
  );
}

function computeRemainingBalance(
  principal: number,
  annualRate: number,
  monthlyPmt: number,
  elapsed: number,
): number {
  if (elapsed <= 0) return principal;
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return Math.max(0, principal - monthlyPmt * elapsed);
  const balance =
    principal * (1 + r) ** elapsed -
    (monthlyPmt * ((1 + r) ** elapsed - 1)) / r;
  return Math.max(0, balance);
}

function buildLiabilityExpenseMap(
  events: FinanceEvent[],
): Map<string, string> {
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

function elapsedMonthsFromDate(startDate: string, now: Date): number {
  const s = new Date(startDate);
  const months =
    (now.getFullYear() - s.getFullYear()) * 12 +
    (now.getMonth() - s.getMonth());
  return Math.max(0, months);
}

function injectEvent(
  event: FinanceEvent,
  state: LoopState,
): void {
  switch (event.type) {
    case 'add_income':
      state.incomeItems.push({
        id: event.income.id,
        name: event.income.name,
        monthlyAmount: Math.round(toMonthly(event.income.amount.amount, event.income.frequency)),
        isStrategy: true,
      });
      break;
    case 'add_expense':
      state.expenseItems.push({
        id: event.expense.id,
        name: event.expense.name,
        monthlyAmount: Math.round(toMonthly(event.expense.amount.amount, event.expense.frequency)),
        active: true,
        isStrategy: true,
      });
      break;
    case 'add_asset':
      state.assetStates.push({
        id: event.asset.id,
        name: event.asset.name,
        kind: event.asset.kind,
        value: event.asset.value.amount,
        growthRate: event.asset.growthRate,
        isStrategy: true,
      });
      break;
    case 'take_mortgage': {
      const principal = event.mortgage.value.amount;
      const totalLoanMonths = monthsBetween(event.mortgage.startDate, event.mortgage.endDate);
      const mp = computeMonthlyPayment(principal, event.mortgage.interestRate, totalLoanMonths);
      state.liabilityStates.push({
        id: event.mortgage.id,
        name: event.mortgage.name,
        kind: 'mortgage',
        balance: principal,
        interestRate: event.mortgage.interestRate,
        monthlyPayment: mp,
        linkedExpenseId: event.expense.id,
        paidOff: false,
        isStrategy: true,
      });
      state.assetStates.push({
        id: event.flat.id,
        name: event.flat.name,
        kind: 'flat',
        value: event.flat.value.amount,
        growthRate: event.flat.growthRate,
        isStrategy: true,
      });
      state.expenseItems.push({
        id: event.expense.id,
        name: event.expense.name,
        monthlyAmount: Math.round(toMonthly(event.expense.amount.amount, event.expense.frequency)),
        active: true,
        isStrategy: true,
      });
      if (event.rental) {
        state.incomeItems.push({
          id: event.income.id,
          name: event.income.name,
          monthlyAmount: Math.round(toMonthly(event.income.amount.amount, event.income.frequency)),
          isStrategy: true,
        });
      }
      break;
    }
    case 'take_personal_loan': {
      const principal = event.loan.value.amount;
      const totalLoanMonths = monthsBetween(event.loan.startDate, event.loan.endDate);
      const mp = computeMonthlyPayment(principal, event.loan.interestRate, totalLoanMonths);
      state.liabilityStates.push({
        id: event.loan.id,
        name: event.loan.name,
        kind: 'loan',
        balance: principal,
        interestRate: event.loan.interestRate,
        monthlyPayment: mp,
        linkedExpenseId: event.expense.id,
        paidOff: false,
        isStrategy: true,
      });
      state.assetStates.push({
        id: event.cash.id,
        name: event.cash.name,
        kind: 'cash',
        value: event.cash.value.amount,
        growthRate: 0,
        isStrategy: true,
      });
      state.expenseItems.push({
        id: event.expense.id,
        name: event.expense.name,
        monthlyAmount: Math.round(toMonthly(event.expense.amount.amount, event.expense.frequency)),
        active: true,
        isStrategy: true,
      });
      break;
    }
    case 'repay_loan': {
      const liability = state.liabilityStates.find((l) => l.id === event.liabilityId);
      if (liability) {
        liability.balance = event.newPrincipal.amount;
        liability.monthlyPayment = event.newMonthlyPayment.amount;
        if (liability.balance <= 0) {
          liability.paidOff = true;
          if (liability.linkedExpenseId) state.paidOffExpenseIds.add(liability.linkedExpenseId);
        }
      }
      const expense = state.expenseItems.find((e) => e.id === event.expenseId);
      if (expense) {
        expense.monthlyAmount = event.newMonthlyPayment.amount;
      }
      break;
    }
    case 'manual_correction':
      break;
  }
}

function buildScheduleMap(events: ScheduledEvent[]): Map<string, ScheduledEvent[]> {
  const map = new Map<string, ScheduledEvent[]>();
  for (const se of events) {
    const key = `${se.year}-${se.month}`;
    const list = map.get(key) ?? [];
    list.push(se);
    map.set(key, list);
  }
  return map;
}

function projectSnapshots(
  events: FinanceEvent[],
  config: SimulatorConfig,
  scheduledEvents: ScheduledEvent[] = [],
  strategyEntityIds: Set<string> = new Set(),
): MonthSnapshot[] {
  const { assets, liabilities, incomes, expenses } = deriveState(events);
  const liabilityExpenseMap = buildLiabilityExpenseMap(events);
  const scheduleMap = buildScheduleMap(scheduledEvents);

  const now = new Date();
  const startMonth = now.getMonth() + 1;
  const startYear = now.getFullYear();
  const totalMonths =
    (config.targetYear - startYear) * 12 +
    (config.targetMonth - startMonth);

  if (totalMonths <= 0) return [];

  const state: LoopState = {
    assetStates: assets.map((a) => ({
      id: a.id,
      name: a.name,
      kind: a.kind,
      value: a.value.amount,
      growthRate: a.growthRate,
      isStrategy: strategyEntityIds.has(a.id),
    })),
    liabilityStates: liabilities.map((l) => {
      const principal = l.value.amount;
      const totalLoanMonths = monthsBetween(l.startDate, l.endDate);
      const mp = computeMonthlyPayment(principal, l.interestRate, totalLoanMonths);
      const elapsed = elapsedMonthsFromDate(l.startDate, now);
      const balance = computeRemainingBalance(principal, l.interestRate, mp, elapsed);
      return {
        id: l.id,
        name: l.name,
        kind: l.kind,
        balance,
        interestRate: l.interestRate,
        monthlyPayment: mp,
        linkedExpenseId: liabilityExpenseMap.get(l.id) ?? null,
        paidOff: balance <= 0,
        isStrategy: strategyEntityIds.has(l.id),
      };
    }),
    incomeItems: incomes.map((inc) => ({
      id: inc.id,
      name: inc.name,
      monthlyAmount: Math.round(toMonthly(inc.amount.amount, inc.frequency)),
      isStrategy: strategyEntityIds.has(inc.id),
    })),
    expenseItems: expenses.map((exp) => ({
      id: exp.id,
      name: exp.name,
      monthlyAmount: Math.round(toMonthly(exp.amount.amount, exp.frequency)),
      active: true,
      isStrategy: strategyEntityIds.has(exp.id),
    })),
    paidOffExpenseIds: new Set<string>(),
    cashReserve: 0,
    accumulatedDeficit: 0,
  };

  const snapshots: MonthSnapshot[] = [];

  for (let i = 1; i <= totalMonths; i++) {
    const m = ((startMonth - 1 + i) % 12) + 1;
    const y = startYear + Math.floor((startMonth - 1 + i) / 12);

    const due = scheduleMap.get(`${y}-${m}`);
    if (due) {
      for (const se of due) injectEvent(se.event, state);
    }

    for (const ls of state.liabilityStates) {
      if (ls.paidOff) continue;
      const r = ls.interestRate / 12;
      const interest = ls.balance * r;
      const principalPortion = Math.min(ls.monthlyPayment - interest, ls.balance);
      ls.balance = Math.max(0, ls.balance - principalPortion);
      if (ls.balance <= 0) {
        ls.paidOff = true;
        if (ls.linkedExpenseId) state.paidOffExpenseIds.add(ls.linkedExpenseId);
      }
    }

    const currentExpenses = state.expenseItems.map((e) => ({
      ...e,
      active: !state.paidOffExpenseIds.has(e.id),
    }));

    const totalIncome = state.incomeItems.reduce((sum, inc) => sum + inc.monthlyAmount, 0);
    const totalExpensesVal = currentExpenses
      .filter((e) => e.active)
      .reduce((sum, exp) => sum + exp.monthlyAmount, 0);

    const cashFlow = totalIncome - totalExpensesVal;

    if (cashFlow >= 0) {
      state.cashReserve += cashFlow;
    } else {
      state.accumulatedDeficit += Math.abs(cashFlow);
    }

    for (const a of state.assetStates) {
      a.value *= 1 + a.growthRate / 12;
    }

    state.cashReserve *= 1 + config.cashReserveGrowthRate / 12;

    const totalAssets = state.assetStates.reduce((sum, a) => sum + a.value, 0);
    const totalLiabilitiesVal = state.liabilityStates.reduce((sum, l) => sum + l.balance, 0);
    const netWorth =
      totalAssets + state.cashReserve - totalLiabilitiesVal - state.accumulatedDeficit;

    snapshots.push({
      month: m,
      year: y,
      monthIndex: i,
      totalIncome: Math.round(totalIncome),
      totalExpenses: Math.round(totalExpensesVal),
      cashFlow: Math.round(cashFlow),
      totalAssets: Math.round(totalAssets),
      cashReserve: Math.round(state.cashReserve),
      totalLiabilities: Math.round(totalLiabilitiesVal),
      accumulatedDeficit: Math.round(state.accumulatedDeficit),
      netWorth: Math.round(netWorth),
      assets: state.assetStates.map((a) => ({
        id: a.id,
        name: a.name,
        kind: a.kind,
        value: Math.round(a.value),
        isStrategy: a.isStrategy || undefined,
      })),
      liabilities: state.liabilityStates.map((l) => ({
        id: l.id,
        name: l.name,
        kind: l.kind,
        balance: Math.round(l.balance),
        isStrategy: l.isStrategy || undefined,
      })),
      incomes: state.incomeItems.map((inc) => ({
        ...inc,
        isStrategy: inc.isStrategy || undefined,
      })),
      expenses: currentExpenses.map((exp) => ({
        ...exp,
        isStrategy: exp.isStrategy || undefined,
      })),
    });
  }

  return snapshots;
}

function collectEntityIds(event: FinanceEvent): string[] {
  switch (event.type) {
    case 'add_income': return [event.income.id];
    case 'add_expense': return [event.expense.id];
    case 'add_asset': return [event.asset.id];
    case 'take_mortgage': {
      const ids = [event.mortgage.id, event.flat.id, event.expense.id];
      if (event.rental) ids.push(event.income.id);
      return ids;
    }
    case 'take_personal_loan': return [event.loan.id, event.cash.id, event.expense.id];
    case 'repay_loan': return [];
    case 'manual_correction': return [];
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

  const strategyEntityIds = new Set(
    strategyAsEvents.flatMap(collectEntityIds),
  );

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
    [...events, ...immediateEvents],
    config,
    scheduledEvents,
    strategyEntityIds,
  );

  return { baseline, strategy };
}
