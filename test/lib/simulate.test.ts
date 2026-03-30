import { describe, expect, it } from 'vitest';
import { runSimulation, type SimulatorConfig } from '@/lib/simulate';
import type {
  AddAssetEvent,
  AddExpenseEvent,
  AddIncomeEvent,
  FinanceEvent,
  NewEventInput,
  TakePersonalLoanEvent,
} from '@/types/events';

const now = new Date();
const startMonth = now.getMonth() + 1;
const startYear = now.getFullYear();

const todayStr = now.toISOString().slice(0, 10);

function futureDate(monthsAhead: number): string {
  const d = new Date(now);
  d.setMonth(d.getMonth() + monthsAhead);
  return d.toISOString().slice(0, 10);
}

const config: SimulatorConfig = {
  targetMonth: startMonth,
  targetYear: startYear + 1,
  cashReserveGrowthRate: 0,
};

const salaryEvent: AddIncomeEvent = {
  id: 'evt-salary',
  date: todayStr,
  status: 'active',
  type: 'add_income',
  income: {
    id: 'inc-salary',
    name: 'Salary',
    amount: { amount: 100_000, currency: 'CZK' },
    frequency: 'monthly',
  },
};

const groceryEvent: AddExpenseEvent = {
  id: 'evt-grocery',
  date: todayStr,
  status: 'active',
  type: 'add_expense',
  expense: {
    id: 'exp-grocery',
    name: 'Grocery',
    amount: { amount: 10_000, currency: 'CZK' },
    frequency: 'monthly',
  },
};

const rentEvent: AddExpenseEvent = {
  id: 'evt-rent',
  date: todayStr,
  status: 'active',
  type: 'add_expense',
  expense: {
    id: 'exp-rent',
    name: 'Rent',
    amount: { amount: 15_000, currency: 'CZK' },
    frequency: 'monthly',
  },
};

const loanEvent: TakePersonalLoanEvent = {
  id: 'evt-loan',
  date: '2025-06-01',
  status: 'active',
  type: 'take_personal_loan',
  loan: {
    id: 'loan-1',
    name: 'Personal Loan',
    kind: 'loan',
    value: { amount: 1_500_000, currency: 'CZK' },
    interestRate: 0.057,
    startDate: '2025-06-01',
    endDate: '2033-06-01',
  },
  cash: {
    id: 'cash-loan',
    name: 'Loan Cash',
    kind: 'cash',
    value: { amount: 1_500_000, currency: 'CZK' },
    growthRate: 0,
  },
  expense: {
    id: 'exp-loan',
    name: 'Loan Payment',
    amount: { amount: 19_494, currency: 'CZK' },
    frequency: 'monthly',
  },
};

const investmentEvent: AddAssetEvent = {
  id: 'evt-investment',
  date: todayStr,
  status: 'active',
  type: 'add_asset',
  asset: {
    id: 'cash-investment',
    name: 'Investment',
    kind: 'cash',
    value: { amount: 2_500_000, currency: 'CZK' },
    growthRate: 0,
  },
};

const savingsEvent: AddAssetEvent = {
  id: 'evt-savings',
  date: todayStr,
  status: 'active',
  type: 'add_asset',
  asset: {
    id: 'cash-savings',
    name: 'Savings',
    kind: 'cash',
    value: { amount: 400_000, currency: 'CZK' },
    growthRate: 0,
  },
};

const allEvents: FinanceEvent[] = [
  salaryEvent,
  groceryEvent,
  rentEvent,
  loanEvent,
  investmentEvent,
  savingsEvent,
];

function buyFlatStrategy(
  date: string,
  allocations: { cashAssetId: string; amount: number }[],
): NewEventInput {
  const totalValue = allocations.reduce((sum, a) => sum + a.amount, 0);
  return {
    type: 'buy_asset',
    date,
    asset: {
      kind: 'flat',
      id: 'flat-new',
      name: 'New Flat',
      value: { amount: totalValue, currency: 'CZK' },
      growthRate: 0,
    },
    allocations: allocations.map((a) => ({
      cashAssetId: a.cashAssetId,
      amount: { amount: a.amount, currency: 'CZK' as const },
    })),
  };
}

describe('runSimulation', () => {
  describe('baseline without strategy', () => {
    it('produces 12 monthly snapshots', () => {
      const result = runSimulation(allEvents, config);
      expect(result.baseline.length).toBe(12);
      expect(result.strategy).toBeNull();
    });

    it('computes cash flow correctly', () => {
      const first = runSimulation(allEvents, config).baseline[0];
      expect(first.totalIncome).toBe(100_000);
      expect(first.totalExpenses).toBe(44_494);
      expect(first.cashFlow).toBe(55_506);
    });

    it('cash assets stay constant with 0 growth', () => {
      const first = runSimulation(allEvents, config).baseline[0];
      expect(first.assets.find((a) => a.id === 'cash-loan')!.value).toBe(1_500_000);
      expect(first.assets.find((a) => a.id === 'cash-investment')!.value).toBe(2_500_000);
      expect(first.assets.find((a) => a.id === 'cash-savings')!.value).toBe(400_000);
    });

    it('accumulates cash reserve from positive cash flow', () => {
      const result = runSimulation(allEvents, config);
      expect(result.baseline[0].cashReserve).toBe(55_506);
      expect(result.baseline[1].cashReserve).toBe(111_012);
    });

    it('loan balance decreases over time', () => {
      const result = runSimulation(allEvents, config);
      const first = result.baseline[0].liabilities.find((l) => l.id === 'loan-1')!;
      const last = result.baseline[11].liabilities.find((l) => l.id === 'loan-1')!;
      expect(first.balance).toBeGreaterThan(last.balance);
    });
  });

  describe('buy flat with loan cash (immediate)', () => {
    const strategy = [
      buyFlatStrategy(todayStr, [{ cashAssetId: 'cash-loan', amount: 1_500_000 }]),
    ];

    it('deducts loan cash to 0', () => {
      const result = runSimulation(allEvents, config, strategy);
      const cash = result.strategy![0].assets.find((a) => a.id === 'cash-loan');
      expect(cash!.value).toBe(0);
    });

    it('adds the flat as strategy entity', () => {
      const result = runSimulation(allEvents, config, strategy);
      const flat = result.strategy![0].assets.find((a) => a.id === 'flat-new');
      expect(flat).toBeDefined();
      expect(flat!.value).toBe(1_500_000);
      expect(flat!.isStrategy).toBe(true);
    });

    it('other cash assets unaffected', () => {
      const first = runSimulation(allEvents, config, strategy).strategy![0];
      expect(first.assets.find((a) => a.id === 'cash-investment')!.value).toBe(2_500_000);
      expect(first.assets.find((a) => a.id === 'cash-savings')!.value).toBe(400_000);
    });

    it('baseline is unaffected', () => {
      const result = runSimulation(allEvents, config, strategy);
      expect(result.baseline[0].assets.find((a) => a.id === 'cash-loan')!.value).toBe(1_500_000);
      expect(result.baseline[0].assets.find((a) => a.id === 'flat-new')).toBeUndefined();
    });

    it('loan still amortizes', () => {
      const result = runSimulation(allEvents, config, strategy);
      const loan = result.strategy![0].liabilities.find((l) => l.id === 'loan-1');
      expect(loan).toBeDefined();
      expect(loan!.balance).toBeGreaterThan(0);
    });
  });

  describe('buy flat with investment cash (immediate)', () => {
    const strategy = [
      buyFlatStrategy(todayStr, [{ cashAssetId: 'cash-investment', amount: 2_000_000 }]),
    ];

    it('deducts investment to 500k', () => {
      const first = runSimulation(allEvents, config, strategy).strategy![0];
      expect(first.assets.find((a) => a.id === 'cash-investment')!.value).toBe(500_000);
    });

    it('loan cash unaffected', () => {
      const first = runSimulation(allEvents, config, strategy).strategy![0];
      expect(first.assets.find((a) => a.id === 'cash-loan')!.value).toBe(1_500_000);
    });
  });

  describe('buy flat with multiple sources (immediate)', () => {
    const strategy = [
      buyFlatStrategy(todayStr, [
        { cashAssetId: 'cash-loan', amount: 1_500_000 },
        { cashAssetId: 'cash-investment', amount: 2_000_000 },
      ]),
    ];

    it('deducts from both sources', () => {
      const first = runSimulation(allEvents, config, strategy).strategy![0];
      expect(first.assets.find((a) => a.id === 'cash-loan')!.value).toBe(0);
      expect(first.assets.find((a) => a.id === 'cash-investment')!.value).toBe(500_000);
    });

    it('flat value equals total allocation', () => {
      const flat = runSimulation(allEvents, config, strategy).strategy![0].assets.find(
        (a) => a.id === 'flat-new',
      );
      expect(flat!.value).toBe(3_500_000);
    });

    it('savings unaffected', () => {
      const first = runSimulation(allEvents, config, strategy).strategy![0];
      expect(first.assets.find((a) => a.id === 'cash-savings')!.value).toBe(400_000);
    });
  });

  describe('buy flat scheduled (future)', () => {
    const scheduledDate = futureDate(6);
    const strategy = [
      buyFlatStrategy(scheduledDate, [{ cashAssetId: 'cash-loan', amount: 1_500_000 }]),
    ];

    it('cash is full before scheduled month', () => {
      const first = runSimulation(allEvents, config, strategy).strategy![0];
      expect(first.assets.find((a) => a.id === 'cash-loan')!.value).toBe(1_500_000);
    });

    it('flat does not exist before scheduled month', () => {
      const first = runSimulation(allEvents, config, strategy).strategy![0];
      expect(first.assets.find((a) => a.id === 'flat-new')).toBeUndefined();
    });

    it('cash is deducted at scheduled month', () => {
      const result = runSimulation(allEvents, config, strategy);
      const d = new Date(scheduledDate);
      const atMonth = result.strategy!.find(
        (s) => s.month === d.getMonth() + 1 && s.year === d.getFullYear(),
      );
      expect(atMonth).toBeDefined();
      expect(atMonth!.assets.find((a) => a.id === 'cash-loan')!.value).toBe(0);
    });

    it('flat appears at scheduled month', () => {
      const result = runSimulation(allEvents, config, strategy);
      const d = new Date(scheduledDate);
      const atMonth = result.strategy!.find(
        (s) => s.month === d.getMonth() + 1 && s.year === d.getFullYear(),
      );
      expect(atMonth!.assets.find((a) => a.id === 'flat-new')).toBeDefined();
    });
  });

  describe('buy flat replacing rent expense', () => {
    const strategy: NewEventInput[] = [
      {
        type: 'buy_asset',
        date: todayStr,
        asset: {
          kind: 'flat',
          id: 'flat-new',
          name: 'New Flat',
          value: { amount: 1_500_000, currency: 'CZK' },
          growthRate: 0,
        },
        allocations: [
          { cashAssetId: 'cash-loan', amount: { amount: 1_500_000, currency: 'CZK' } },
        ],
        forLiving: true,
        removeExpenseId: 'exp-rent',
      },
    ];

    it('removes rent expense', () => {
      const first = runSimulation(allEvents, config, strategy).strategy![0];
      expect(first.expenses.find((e) => e.id === 'exp-rent')).toBeUndefined();
    });

    it('reduces total expenses by rent amount', () => {
      const result = runSimulation(allEvents, config, strategy);
      expect(result.strategy![0].totalExpenses).toBe(result.baseline[0].totalExpenses - 15_000);
    });

    it('rent remains in baseline', () => {
      const result = runSimulation(allEvents, config, strategy);
      const rent = result.baseline[0].expenses.find((e) => e.id === 'exp-rent');
      expect(rent).toBeDefined();
      expect(rent!.active).toBe(true);
    });
  });

  describe('take_personal_loan + buy_asset both as strategy', () => {
    const loanStrategy: NewEventInput = {
      type: 'take_personal_loan',
      date: todayStr,
      loan: {
        id: 'strat-loan',
        name: 'Business Loan',
        kind: 'loan',
        value: { amount: 2_600_000, currency: 'CZK' },
        interestRate: 0.06,
        startDate: todayStr,
        endDate: futureDate(72),
      },
      cash: {
        id: 'strat-cash',
        name: 'Business Cash',
        kind: 'cash',
        value: { amount: 2_600_000, currency: 'CZK' },
        growthRate: 0,
      },
      expense: {
        id: 'strat-exp',
        name: 'Business Payment',
        amount: { amount: 43_000, currency: 'CZK' },
        frequency: 'monthly',
      },
    };

    const buyFlatFromStratCash: NewEventInput = {
      type: 'buy_asset',
      date: todayStr,
      asset: {
        kind: 'flat',
        id: 'strat-flat',
        name: 'Serbia Flat',
        value: { amount: 2_600_000, currency: 'CZK' },
        growthRate: 0.03,
      },
      allocations: [
        { cashAssetId: 'strat-cash', amount: { amount: 2_600_000, currency: 'CZK' } },
      ],
    };

    it('deducts strategy loan cash when buying flat', () => {
      const result = runSimulation(allEvents, config, [loanStrategy, buyFlatFromStratCash]);
      const first = result.strategy![0];

      const cash = first.assets.find((a) => a.id === 'strat-cash');
      expect(cash).toBeDefined();
      expect(cash!.value).toBe(0);
    });

    it('flat is added with correct value', () => {
      const result = runSimulation(allEvents, config, [loanStrategy, buyFlatFromStratCash]);
      const flat = result.strategy![0].assets.find((a) => a.id === 'strat-flat');
      expect(flat).toBeDefined();
      expect(flat!.value).toBeGreaterThan(0);
    });

    it('loan liability exists', () => {
      const result = runSimulation(allEvents, config, [loanStrategy, buyFlatFromStratCash]);
      const loan = result.strategy![0].liabilities.find((l) => l.id === 'strat-loan');
      expect(loan).toBeDefined();
      expect(loan!.balance).toBeGreaterThan(0);
    });

    it('loan expense is active', () => {
      const result = runSimulation(allEvents, config, [loanStrategy, buyFlatFromStratCash]);
      const exp = result.strategy![0].expenses.find((e) => e.id === 'strat-exp');
      expect(exp).toBeDefined();
      expect(exp!.active).toBe(true);
    });

    it('baseline is unaffected', () => {
      const result = runSimulation(allEvents, config, [loanStrategy, buyFlatFromStratCash]);
      expect(result.baseline[0].assets.find((a) => a.id === 'strat-cash')).toBeUndefined();
      expect(result.baseline[0].assets.find((a) => a.id === 'strat-flat')).toBeUndefined();
    });

    it('works when buy_asset is scheduled later', () => {
      const laterBuy: NewEventInput = { ...buyFlatFromStratCash, date: futureDate(3) };
      const result = runSimulation(allEvents, config, [loanStrategy, laterBuy]);

      const first = result.strategy![0];
      const cashBefore = first.assets.find((a) => a.id === 'strat-cash');
      expect(cashBefore!.value).toBe(2_600_000);

      const d = new Date(futureDate(3));
      const atMonth = result.strategy!.find(
        (s) => s.month === d.getMonth() + 1 && s.year === d.getFullYear(),
      );
      expect(atMonth).toBeDefined();
      const cashAfter = atMonth!.assets.find((a) => a.id === 'strat-cash');
      expect(cashAfter!.value).toBe(0);
    });

    it('deducts cash even when buy_asset date is before loan date', () => {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      const loanTomorrow: NewEventInput = { ...loanStrategy, date: todayStr };
      const buyYesterday: NewEventInput = { ...buyFlatFromStratCash, date: yesterdayStr };

      const result = runSimulation(allEvents, config, [loanTomorrow, buyYesterday]);
      const first = result.strategy![0];

      const cash = first.assets.find((a) => a.id === 'strat-cash');
      expect(cash).toBeDefined();
      expect(cash!.value).toBe(0);

      const flat = first.assets.find((a) => a.id === 'strat-flat');
      expect(flat).toBeDefined();
      expect(flat!.value).toBeGreaterThan(0);
    });
  });
});
