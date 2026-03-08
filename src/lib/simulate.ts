import { toMonthly } from '@/lib/format';
import type {
  Asset,
  Expense,
  FinanceStore,
  Income,
  Loan,
} from '@/types/finance';

export type StrategyConfig = {
  assets: Asset[];
  loans: Loan[];
  incomes: Income[];
  expenses: Expense[];
  reinvestTargetId: string | null;
};

export type MonthSnapshot = {
  month: number;
  netWorth: number;
  cashFlow: number;
  passiveIncome: number;
  totalExpenses: number;
};

export type SimulationResult = {
  snapshots: MonthSnapshot[];
  fiMonth: number | null;
  totalInterestPaid: number;
  peakNegativeCashFlow: number;
  peakDebtToAsset: number;
};

function cloneStrategy(cfg: StrategyConfig): StrategyConfig {
  return {
    assets: cfg.assets.map((a) => ({ ...a })),
    loans: cfg.loans.map((l) => ({ ...l })),
    incomes: [...cfg.incomes],
    expenses: cfg.expenses.filter((e) => e.category === 'living_expense'),
    reinvestTargetId: cfg.reinvestTargetId,
  };
}

export function runSimulation(
  cfg: StrategyConfig,
  horizonYears: number,
): SimulationResult {
  const s = cloneStrategy(cfg);
  const months = horizonYears * 12;
  const snapshots: MonthSnapshot[] = [];
  let totalInterestPaid = 0;
  let peakNegativeCashFlow = 0;
  let peakDebtToAsset = 0;
  let fiMonth: number | null = null;

  const manualExpenseMonthly = s.expenses.reduce(
    (sum, e) => sum + toMonthly(e.amount, e.frequency),
    0,
  );

  for (let m = 1; m <= months; m++) {
    const passiveIncome = s.incomes
      .filter((i) => i.isPassive)
      .reduce((sum, i) => sum + toMonthly(i.amount, i.frequency), 0);

    const manualIncome = s.incomes
      .filter((i) => !i.isPassive)
      .reduce((sum, i) => sum + toMonthly(i.amount, i.frequency), 0);

    const totalIncome = passiveIncome + manualIncome;

    let debtService = 0;
    for (const loan of s.loans) {
      if (loan.currentBalance <= 0) continue;
      const r = loan.interestRate / 12;
      const interest = loan.currentBalance * r;
      const principalPortion = Math.min(
        loan.monthlyPayment - interest,
        loan.currentBalance,
      );
      loan.currentBalance = Math.max(0, loan.currentBalance - principalPortion);
      debtService += loan.monthlyPayment;
      totalInterestPaid += interest;
    }

    const totalExpenses = manualExpenseMonthly + debtService;
    const cashFlow = totalIncome - totalExpenses;

    if (cashFlow < peakNegativeCashFlow) peakNegativeCashFlow = cashFlow;

    for (const asset of s.assets) {
      if (asset.type === 'real_estate') {
        asset.value *= 1 + 0.03 / 12;
      } else if (asset.type === 'etf' || asset.type === 'crypto') {
        asset.value *= 1 + 0.07 / 12;
      } else if (asset.type === 'cash') {
        asset.value *= 1 + 0.02 / 12;
      }
    }

    if (cashFlow > 0 && s.reinvestTargetId) {
      const target = s.assets.find((a) => a.id === s.reinvestTargetId);
      if (target) target.value += cashFlow;
    }

    const totalAssets = s.assets.reduce((sum, a) => sum + a.value, 0);
    const totalDebt = s.loans.reduce((sum, l) => sum + l.currentBalance, 0);
    const netWorth = totalAssets - totalDebt;
    const dta = totalAssets > 0 ? totalDebt / totalAssets : 0;
    if (dta > peakDebtToAsset) peakDebtToAsset = dta;

    if (
      fiMonth === null &&
      passiveIncome >= manualExpenseMonthly &&
      manualExpenseMonthly > 0
    ) {
      fiMonth = m;
    }

    snapshots.push({
      month: m,
      netWorth: Math.round(netWorth),
      cashFlow: Math.round(cashFlow),
      passiveIncome: Math.round(passiveIncome),
      totalExpenses: Math.round(totalExpenses),
    });
  }

  return {
    snapshots,
    fiMonth,
    totalInterestPaid: Math.round(totalInterestPaid),
    peakNegativeCashFlow: Math.round(peakNegativeCashFlow),
    peakDebtToAsset,
  };
}

export function storeToStrategy(store: FinanceStore): StrategyConfig {
  return {
    assets: store.assets.map((a) => ({ ...a })),
    loans: store.liabilities
      .filter((l): l is Loan => l.type === 'loan')
      .map((l) => ({ ...l })),
    incomes: [...store.incomes],
    expenses: [...store.expenses],
    reinvestTargetId: null,
  };
}
