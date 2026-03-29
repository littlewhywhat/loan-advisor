import { toMonthly } from '@/lib/format';
import type { FinanceEvent } from '@/types/events';
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
};

export type LiabilitySnapshot = {
  id: string;
  name: string;
  kind: 'loan' | 'mortgage';
  balance: number;
};

export type IncomeLineItem = {
  id: string;
  name: string;
  monthlyAmount: number;
};

export type ExpenseLineItem = {
  id: string;
  name: string;
  monthlyAmount: number;
  active: boolean;
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
  snapshots: MonthSnapshot[];
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

export function runSimulation(
  events: FinanceEvent[],
  config: SimulatorConfig,
): SimulationResult {
  const { assets, liabilities, incomes, expenses } = deriveState(events);
  const liabilityExpenseMap = buildLiabilityExpenseMap(events);

  const now = new Date();
  const startMonth = now.getMonth() + 1;
  const startYear = now.getFullYear();
  const totalMonths =
    (config.targetYear - startYear) * 12 +
    (config.targetMonth - startMonth);

  if (totalMonths <= 0) return { snapshots: [] };

  const assetStates = assets.map((a) => ({
    id: a.id,
    name: a.name,
    kind: a.kind,
    value: a.value.amount,
    growthRate: a.growthRate,
  }));

  const liabilityStates: LiabilityState[] = liabilities.map((l) => {
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
    };
  });

  const incomeItems: IncomeLineItem[] = incomes.map((inc) => ({
    id: inc.id,
    name: inc.name,
    monthlyAmount: Math.round(toMonthly(inc.amount.amount, inc.frequency)),
  }));

  const expenseItems: ExpenseLineItem[] = expenses.map((exp) => ({
    id: exp.id,
    name: exp.name,
    monthlyAmount: Math.round(toMonthly(exp.amount.amount, exp.frequency)),
    active: true,
  }));

  const paidOffExpenseIds = new Set<string>();
  let cashReserve = 0;
  let accumulatedDeficit = 0;
  const snapshots: MonthSnapshot[] = [];

  for (let i = 1; i <= totalMonths; i++) {
    const m = ((startMonth - 1 + i) % 12) + 1;
    const y = startYear + Math.floor((startMonth - 1 + i) / 12);

    for (const ls of liabilityStates) {
      if (ls.paidOff) continue;
      const r = ls.interestRate / 12;
      const interest = ls.balance * r;
      const principalPortion = Math.min(ls.monthlyPayment - interest, ls.balance);
      ls.balance = Math.max(0, ls.balance - principalPortion);
      if (ls.balance <= 0) {
        ls.paidOff = true;
        if (ls.linkedExpenseId) paidOffExpenseIds.add(ls.linkedExpenseId);
      }
    }

    const currentExpenses = expenseItems.map((e) => ({
      ...e,
      active: !paidOffExpenseIds.has(e.id),
    }));

    const totalIncome = incomeItems.reduce((sum, inc) => sum + inc.monthlyAmount, 0);
    const totalExpensesVal = currentExpenses
      .filter((e) => e.active)
      .reduce((sum, exp) => sum + exp.monthlyAmount, 0);

    const cashFlow = totalIncome - totalExpensesVal;

    if (cashFlow >= 0) {
      cashReserve += cashFlow;
    } else {
      accumulatedDeficit += Math.abs(cashFlow);
    }

    for (const a of assetStates) {
      a.value *= 1 + a.growthRate / 12;
    }

    cashReserve *= 1 + config.cashReserveGrowthRate / 12;

    const totalAssets = assetStates.reduce((sum, a) => sum + a.value, 0);
    const totalLiabilitiesVal = liabilityStates.reduce((sum, l) => sum + l.balance, 0);
    const netWorth =
      totalAssets + cashReserve - totalLiabilitiesVal - accumulatedDeficit;

    snapshots.push({
      month: m,
      year: y,
      monthIndex: i,
      totalIncome: Math.round(totalIncome),
      totalExpenses: Math.round(totalExpensesVal),
      cashFlow: Math.round(cashFlow),
      totalAssets: Math.round(totalAssets),
      cashReserve: Math.round(cashReserve),
      totalLiabilities: Math.round(totalLiabilitiesVal),
      accumulatedDeficit: Math.round(accumulatedDeficit),
      netWorth: Math.round(netWorth),
      assets: assetStates.map((a) => ({
        id: a.id,
        name: a.name,
        kind: a.kind,
        value: Math.round(a.value),
      })),
      liabilities: liabilityStates.map((l) => ({
        id: l.id,
        name: l.name,
        kind: l.kind,
        balance: Math.round(l.balance),
      })),
      incomes: [...incomeItems],
      expenses: currentExpenses,
    });
  }

  return { snapshots };
}
