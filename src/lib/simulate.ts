import { toMonthly } from '@/lib/format';
import type { FinanceStore, Loan } from '@/types/finance';
import type {
  MonthSummary,
  Mutation,
  Scenario,
  SimulationResult,
  SimulationStep,
  TimelineEvent,
} from '@/types/simulation';

function cloneStore(store: FinanceStore): FinanceStore {
  return {
    currency: store.currency,
    assets: store.assets.map((a) => ({
      ...a,
      linkedIncomeIds: [...a.linkedIncomeIds],
    })),
    liabilities: store.liabilities.map((l) => ({ ...l })),
    incomes: store.incomes.map((i) => ({ ...i })),
    expenses: store.expenses.map((e) => ({ ...e })),
  };
}

function applyMutation(store: FinanceStore, mutation: Mutation): void {
  switch (mutation.type) {
    case 'add_asset':
      store.assets.push({ ...mutation.asset });
      break;
    case 'remove_asset':
      store.assets = store.assets.filter((a) => a.id !== mutation.assetId);
      break;
    case 'adjust_asset_value': {
      const asset = store.assets.find((a) => a.id === mutation.assetId);
      if (asset) asset.value += mutation.delta;
      break;
    }
    case 'add_liability':
      store.liabilities.push({ ...mutation.liability });
      break;
    case 'remove_liability':
      store.liabilities = store.liabilities.filter(
        (l) => l.id !== mutation.liabilityId,
      );
      store.expenses = store.expenses.filter(
        (e) => e.linkedLiabilityId !== mutation.liabilityId,
      );
      break;
    case 'pay_off_loan': {
      const loan = store.liabilities.find(
        (l) => l.id === mutation.liabilityId,
      );
      if (loan && loan.type === 'loan') {
        const cashAsset = store.assets.find((a) => a.type === 'cash');
        if (cashAsset) cashAsset.value -= loan.currentBalance;
        loan.currentBalance = 0;
        store.expenses = store.expenses.filter(
          (e) => e.linkedLiabilityId !== mutation.liabilityId,
        );
      }
      break;
    }
    case 'add_income':
      store.incomes.push({ ...mutation.income });
      break;
    case 'remove_income':
      store.incomes = store.incomes.filter(
        (i) => i.id !== mutation.incomeId,
      );
      break;
    case 'update_income': {
      const income = store.incomes.find((i) => i.id === mutation.incomeId);
      if (income) Object.assign(income, mutation.changes);
      break;
    }
    case 'add_expense':
      store.expenses.push({ ...mutation.expense });
      break;
    case 'remove_expense':
      store.expenses = store.expenses.filter(
        (e) => e.id !== mutation.expenseId,
      );
      break;
    case 'transfer': {
      const from = store.assets.find((a) => a.id === mutation.fromAssetId);
      const to = store.assets.find((a) => a.id === mutation.toAssetId);
      if (from && to) {
        const amt = Math.min(mutation.amount, Math.max(0, from.value));
        from.value -= amt;
        to.value += amt;
      }
      break;
    }
  }
}

function shouldFire(event: TimelineEvent, month: number): boolean {
  if (event.schedule === 'once') return event.month === month;
  if (month < event.startMonth) return false;
  if (event.endMonth !== null && month > event.endMonth) return false;
  const elapsed = month - event.startMonth;
  switch (event.frequency) {
    case 'monthly':
      return true;
    case 'quarterly':
      return elapsed % 3 === 0;
    case 'annually':
      return elapsed % 12 === 0;
  }
}

function computeSummary(store: FinanceStore, month: number): MonthSummary {
  const totalAssets = store.assets.reduce((s, a) => s + a.value, 0);
  const loans = store.liabilities.filter(
    (l): l is Loan => l.type === 'loan',
  );
  const totalDebt = loans.reduce((s, l) => s + l.currentBalance, 0);
  const netWorth = totalAssets - totalDebt;

  const passiveIncome = store.incomes
    .filter((i) => i.isPassive)
    .reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);
  const totalIncome = store.incomes.reduce(
    (s, i) => s + toMonthly(i.amount, i.frequency),
    0,
  );
  const totalExpenses = store.expenses.reduce(
    (s, e) => s + toMonthly(e.amount, e.frequency),
    0,
  );
  const cashFlow = totalIncome - totalExpenses;

  const debtService = store.expenses
    .filter((e) => e.category === 'liability')
    .reduce((s, e) => s + toMonthly(e.amount, e.frequency), 0);
  const dti = totalIncome > 0 ? debtService / totalIncome : 0;

  const maxPayment = totalIncome * 0.4 - debtService;
  const r = 0.05 / 12;
  const n = 300;
  const maxBorrowable =
    maxPayment > 0
      ? (maxPayment * (1 - (1 + r) ** -n)) / r
      : 0;

  return {
    month,
    netWorth: Math.round(netWorth),
    cashFlow: Math.round(cashFlow),
    passiveIncome: Math.round(passiveIncome),
    totalIncome: Math.round(totalIncome),
    totalExpenses: Math.round(totalExpenses),
    totalAssets: Math.round(totalAssets),
    totalDebt: Math.round(totalDebt),
    dti,
    maxBorrowable: Math.round(maxBorrowable),
  };
}

export function computeMonthlyPayment(
  principal: number,
  annualRate: number,
  years: number,
): number {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return principal * ((r * (1 + r) ** n) / ((1 + r) ** n - 1));
}

export function runSimulation(
  baseStore: FinanceStore,
  scenario: Scenario,
  horizonYears: number,
): SimulationResult {
  const store = cloneStore(baseStore);
  const months = horizonYears * 12;
  const steps: SimulationStep[] = [];
  let totalInterestPaid = 0;
  let fiMonth: number | null = null;

  for (let m = 1; m <= months; m++) {
    for (const event of scenario.events) {
      if (shouldFire(event, m)) {
        for (const mutation of event.mutations) {
          applyMutation(store, mutation);
        }
      }
    }

    const paidOffIds: string[] = [];
    const loans = store.liabilities.filter(
      (l): l is Loan => l.type === 'loan',
    );
    for (const loan of loans) {
      if (loan.currentBalance <= 0) continue;
      const r = loan.interestRate / 12;
      const interest = loan.currentBalance * r;
      const principalPortion = Math.min(
        loan.monthlyPayment - interest,
        loan.currentBalance,
      );
      loan.currentBalance = Math.max(0, loan.currentBalance - principalPortion);
      totalInterestPaid += interest;
      if (loan.currentBalance <= 0) paidOffIds.push(loan.id);
    }

    const totalIncome = store.incomes.reduce(
      (s, i) => s + toMonthly(i.amount, i.frequency),
      0,
    );
    const totalExpenses = store.expenses.reduce(
      (s, e) => s + toMonthly(e.amount, e.frequency),
      0,
    );
    const cashFlow = totalIncome - totalExpenses;

    const cashAsset = store.assets.find((a) => a.type === 'cash');
    if (cashAsset) cashAsset.value += cashFlow;

    for (const id of paidOffIds) {
      store.expenses = store.expenses.filter(
        (e) => e.linkedLiabilityId !== id,
      );
    }

    const { realEstateGrowth, etfCryptoGrowth, cashInterest } =
      scenario.assumptions;
    for (const asset of store.assets) {
      let rate = 0;
      if (asset.type === 'real_estate') rate = realEstateGrowth;
      else if (asset.type === 'etf' || asset.type === 'crypto')
        rate = etfCryptoGrowth;
      else if (asset.type === 'cash') rate = cashInterest;
      asset.value *= 1 + rate / 12;
    }

    const summary = computeSummary(store, m);

    const livingExpenseMonthly = store.expenses
      .filter((e) => e.category === 'living_expense')
      .reduce((s, e) => s + toMonthly(e.amount, e.frequency), 0);
    if (
      fiMonth === null &&
      summary.passiveIncome >= livingExpenseMonthly &&
      livingExpenseMonthly > 0
    ) {
      fiMonth = m;
    }

    steps.push({ month: m, state: cloneStore(store), summary });
  }

  return { steps, fiMonth, totalInterestPaid: Math.round(totalInterestPaid) };
}
