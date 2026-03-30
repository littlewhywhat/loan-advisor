import { describe, expect, it } from 'vitest';
import { deriveState } from '@/lib/deriveState';
import type {
  AddAssetEvent,
  AddExpenseEvent,
  AddIncomeEvent,
  BuyAssetEvent,
  FinanceEvent,
  ManualCorrectionEvent,
  TakeMortgageEvent,
  TakePersonalLoanEvent,
} from '@/types/events';

const mortgage: TakeMortgageEvent = {
  id: 'evt-1',
  date: '2026-04-01',
  status: 'active',
  type: 'take_mortgage',
  rental: false,
  mortgage: {
    kind: 'mortgage',
    id: 'mort-1',
    name: 'My Flat',
    value: { amount: 5_000_000, currency: 'CZK' },
    interestRate: 5.5,
    downPayment: { amount: 1_000_000, currency: 'CZK' },
    startDate: '2026-04-01',
    endDate: '2056-04-01',
  },
  flat: {
    kind: 'flat',
    id: 'flat-1',
    name: 'My Flat',
    value: { amount: 6_000_000, currency: 'CZK' },
    growthRate: 3,
  },
  expense: {
    id: 'exp-1',
    name: 'My Flat Payment',
    amount: { amount: 28_388, currency: 'CZK' },
    frequency: 'monthly',
  },
};

const rentalMortgage: TakeMortgageEvent = {
  id: 'evt-2',
  date: '2026-04-01',
  status: 'active',
  type: 'take_mortgage',
  rental: true,
  mortgage: {
    kind: 'mortgage',
    id: 'mort-2',
    name: 'Rental Flat',
    value: { amount: 3_000_000, currency: 'CZK' },
    interestRate: 5.5,
    downPayment: { amount: 600_000, currency: 'CZK' },
    startDate: '2026-04-01',
    endDate: '2056-04-01',
  },
  flat: {
    kind: 'flat',
    id: 'flat-2',
    name: 'Rental Flat',
    value: { amount: 3_600_000, currency: 'CZK' },
    growthRate: 3,
  },
  expense: {
    id: 'exp-2',
    name: 'Rental Flat Payment',
    amount: { amount: 17_033, currency: 'CZK' },
    frequency: 'monthly',
  },
  income: {
    id: 'inc-1',
    name: 'Rental Flat Income',
    amount: { amount: 15_000, currency: 'CZK' },
    frequency: 'monthly',
  },
};

const personalLoan: TakePersonalLoanEvent = {
  id: 'evt-3',
  date: '2026-04-01',
  status: 'active',
  type: 'take_personal_loan',
  loan: {
    kind: 'loan',
    id: 'loan-1',
    name: 'Car Loan',
    value: { amount: 500_000, currency: 'CZK' },
    interestRate: 8.0,
    startDate: '2026-04-01',
    endDate: '2031-04-01',
  },
  cash: {
    kind: 'cash',
    id: 'cash-1',
    name: 'Car Loan Cash',
    value: { amount: 500_000, currency: 'CZK' },
    growthRate: 0,
  },
  expense: {
    id: 'exp-3',
    name: 'Car Loan Payment',
    amount: { amount: 10_138, currency: 'CZK' },
    frequency: 'monthly',
  },
};

const savings: AddAssetEvent = {
  id: 'evt-6',
  date: '2026-04-01',
  status: 'active',
  type: 'add_asset',
  asset: {
    kind: 'cash',
    id: 'cash-2',
    name: 'Savings',
    value: { amount: 500_000, currency: 'CZK' },
    growthRate: 3.0,
  },
};

const familyHouse: AddAssetEvent = {
  id: 'evt-7',
  date: '2026-04-01',
  status: 'active',
  type: 'add_asset',
  asset: {
    kind: 'flat',
    id: 'flat-3',
    name: 'Family House',
    value: { amount: 8_000_000, currency: 'CZK' },
    growthRate: 2.5,
  },
};

const salary: AddIncomeEvent = {
  id: 'evt-4',
  date: '2026-04-01',
  status: 'active',
  type: 'add_income',
  income: {
    id: 'inc-2',
    name: 'Salary',
    amount: { amount: 80_000, currency: 'CZK' },
    frequency: 'monthly',
  },
};

const groceries: AddExpenseEvent = {
  id: 'evt-5',
  date: '2026-04-01',
  status: 'active',
  type: 'add_expense',
  expense: {
    id: 'exp-4',
    name: 'Groceries',
    amount: { amount: 8_000, currency: 'CZK' },
    frequency: 'monthly',
  },
};

const personalLoan2: TakePersonalLoanEvent = {
  id: 'evt-8',
  date: '2026-03-30',
  status: 'active',
  type: 'take_personal_loan',
  loan: {
    kind: 'loan',
    id: 'loan-2',
    name: 'Business Loan',
    value: { amount: 2_850_000, currency: 'CZK' },
    interestRate: 0.077,
    startDate: '2026-03-30',
    endDate: '2032-03-30',
  },
  cash: {
    kind: 'cash',
    id: 'cash-3',
    name: 'Business Loan Cash',
    value: { amount: 2_850_000, currency: 'CZK' },
    growthRate: 0,
  },
  expense: {
    id: 'exp-5',
    name: 'Business Loan Payment',
    amount: { amount: 49_553, currency: 'CZK' },
    frequency: 'monthly',
  },
};

const buyFlatWithTwoLoans: BuyAssetEvent = {
  id: 'evt-9',
  date: '2026-04-15',
  status: 'active',
  type: 'buy_asset',
  asset: {
    kind: 'flat',
    id: 'flat-4',
    name: 'Serbia Flat',
    value: { amount: 3_000_000, currency: 'CZK' },
    growthRate: 0.05,
  },
  allocations: [
    { cashAssetId: 'cash-1', amount: { amount: 500_000, currency: 'CZK' } },
    { cashAssetId: 'cash-3', amount: { amount: 2_500_000, currency: 'CZK' } },
  ],
};

const buyFlatSingleLoan: BuyAssetEvent = {
  id: 'evt-10',
  date: '2026-04-15',
  status: 'active',
  type: 'buy_asset',
  asset: {
    kind: 'flat',
    id: 'flat-5',
    name: 'Studio',
    value: { amount: 2_850_000, currency: 'CZK' },
    growthRate: 0.03,
  },
  allocations: [
    { cashAssetId: 'cash-3', amount: { amount: 2_850_000, currency: 'CZK' } },
  ],
};

describe('deriveState', () => {
  describe('take mortgage', () => {
    it('creates mortgage liability, flat asset and expense', () => {
      const state = deriveState([mortgage]);
      expect(state.liabilities).toHaveLength(1);
      expect(state.liabilities[0]).toEqual(mortgage.mortgage);
      expect(state.assets).toHaveLength(1);
      expect(state.assets[0]).toEqual(mortgage.flat);
      expect(state.expenses).toHaveLength(1);
      expect(state.expenses[0]).toEqual(mortgage.expense);
      expect(state.incomes).toHaveLength(0);
    });

    it('creates income when rental', () => {
      const state = deriveState([rentalMortgage]);
      expect(state.incomes).toHaveLength(1);
      expect(state.incomes[0]).toEqual(rentalMortgage.income);
      expect(state.liabilities).toHaveLength(1);
      expect(state.assets).toHaveLength(1);
      expect(state.expenses).toHaveLength(1);
    });
  });

  describe('take personal loan', () => {
    it('creates loan liability, cash asset and expense', () => {
      const state = deriveState([personalLoan]);
      expect(state.liabilities).toHaveLength(1);
      expect(state.liabilities[0]).toEqual(personalLoan.loan);
      expect(state.assets).toHaveLength(1);
      expect(state.assets[0]).toEqual(personalLoan.cash);
      expect(state.expenses).toHaveLength(1);
      expect(state.expenses[0]).toEqual(personalLoan.expense);
    });
  });

  describe('add asset', () => {
    it('creates standalone cash asset', () => {
      const state = deriveState([savings]);
      expect(state.assets).toHaveLength(1);
      expect(state.assets[0]).toEqual(savings.asset);
      expect(state.liabilities).toHaveLength(0);
      expect(state.incomes).toHaveLength(0);
      expect(state.expenses).toHaveLength(0);
    });

    it('creates standalone flat asset', () => {
      const state = deriveState([familyHouse]);
      expect(state.assets).toHaveLength(1);
      expect(state.assets[0]).toEqual(familyHouse.asset);
      expect(state.assets[0].kind).toBe('flat');
    });
  });

  describe('add income and expense', () => {
    it('creates standalone income', () => {
      const state = deriveState([salary]);
      expect(state.incomes).toHaveLength(1);
      expect(state.incomes[0]).toEqual(salary.income);
      expect(state.assets).toHaveLength(0);
      expect(state.liabilities).toHaveLength(0);
      expect(state.expenses).toHaveLength(0);
    });

    it('creates standalone expense', () => {
      const state = deriveState([groceries]);
      expect(state.expenses).toHaveLength(1);
      expect(state.expenses[0]).toEqual(groceries.expense);
    });
  });

  describe('archive, restore, delete', () => {
    it('excludes archived events from state', () => {
      const archived: FinanceEvent = { ...salary, status: 'archived' };
      const state = deriveState([archived, groceries]);
      expect(state.incomes).toHaveLength(0);
      expect(state.expenses).toHaveLength(1);
    });

    it('restoring an event re-includes it', () => {
      const restored: FinanceEvent = {
        ...salary,
        status: 'archived',
      };
      const before = deriveState([restored]);
      expect(before.incomes).toHaveLength(0);

      const after = deriveState([{ ...restored, status: 'active' }]);
      expect(after.incomes).toHaveLength(1);
    });

    it('deleted events are simply absent', () => {
      const state = deriveState([]);
      expect(state.assets).toHaveLength(0);
      expect(state.liabilities).toHaveLength(0);
      expect(state.incomes).toHaveLength(0);
      expect(state.expenses).toHaveLength(0);
    });
  });

  describe('date ordering', () => {
    it('processes events in date order regardless of array order', () => {
      const earlier: AddIncomeEvent = {
        ...salary,
        id: 'evt-early',
        date: '2026-01-01',
      };
      const later: AddExpenseEvent = {
        ...groceries,
        id: 'evt-late',
        date: '2026-06-01',
      };
      const stateA = deriveState([later, earlier]);
      const stateB = deriveState([earlier, later]);
      expect(stateA).toEqual(stateB);
    });
  });

  describe('manual correction', () => {
    it('patches an income amount', () => {
      const correction: ManualCorrectionEvent = {
        id: 'evt-corr',
        date: '2026-05-01',
        status: 'active',
        type: 'manual_correction',
        changes: {
          incomes: {
            'inc-2': { amount: { amount: 90_000 } },
          },
        },
      };
      const state = deriveState([salary, correction]);
      expect(state.incomes).toHaveLength(1);
      expect(state.incomes[0].amount.amount).toBe(90_000);
      expect(state.incomes[0].amount.currency).toBe('CZK');
      expect(state.incomes[0].name).toBe('Salary');
    });

    it('patches mortgage interest rate and flat value', () => {
      const correction: ManualCorrectionEvent = {
        id: 'evt-corr',
        date: '2026-05-01',
        status: 'active',
        type: 'manual_correction',
        changes: {
          liabilities: {
            'mort-1': { interestRate: 4.5, value: { amount: 4_800_000 } },
          },
          assets: {
            'flat-1': { value: { amount: 7_000_000 } },
          },
        },
      };
      const state = deriveState([mortgage, correction]);
      expect(state.liabilities).toHaveLength(1);
      const m = state.liabilities[0];
      expect(m.interestRate).toBe(4.5);
      expect(m.value.amount).toBe(4_800_000);
      expect(m.value.currency).toBe('CZK');
      expect(m.name).toBe('My Flat');
      expect(state.assets).toHaveLength(1);
      expect(state.assets[0].value.amount).toBe(7_000_000);
      expect(state.assets[0].value.currency).toBe('CZK');
    });

    it('patches mortgage expense while keeping other mortgage entities intact', () => {
      const correction: ManualCorrectionEvent = {
        id: 'evt-corr',
        date: '2026-05-01',
        status: 'active',
        type: 'manual_correction',
        changes: {
          expenses: {
            'exp-2': { amount: { amount: 18_000 } },
          },
        },
      };
      const state = deriveState([rentalMortgage, correction]);
      expect(state.expenses[0].amount.amount).toBe(18_000);
      expect(state.expenses[0].amount.currency).toBe('CZK');
      expect(state.liabilities[0].value.amount).toBe(3_000_000);
      expect(state.incomes[0].amount.amount).toBe(15_000);
    });

    it('patches an expense frequency', () => {
      const correction: ManualCorrectionEvent = {
        id: 'evt-corr',
        date: '2026-05-01',
        status: 'active',
        type: 'manual_correction',
        changes: {
          expenses: {
            'exp-4': { frequency: 'quarterly' },
          },
        },
      };
      const state = deriveState([groceries, correction]);
      expect(state.expenses[0].frequency).toBe('quarterly');
      expect(state.expenses[0].amount.amount).toBe(8_000);
    });
  });

  describe('buy asset', () => {
    it('reduces cash from single source and creates flat', () => {
      const events: FinanceEvent[] = [personalLoan2, buyFlatSingleLoan];
      const state = deriveState(events);

      const flat = state.assets.find((a) => a.id === 'flat-5');
      expect(flat).toBeDefined();
      expect(flat!.value.amount).toBe(2_850_000);

      const cash = state.assets.find((a) => a.id === 'cash-3');
      expect(cash).toBeDefined();
      expect(cash!.value.amount).toBe(0);
    });

    it('reduces cash from multiple sources', () => {
      const events: FinanceEvent[] = [personalLoan, personalLoan2, buyFlatWithTwoLoans];
      const state = deriveState(events);

      const flat = state.assets.find((a) => a.id === 'flat-4');
      expect(flat).toBeDefined();
      expect(flat!.value.amount).toBe(3_000_000);

      const cash1 = state.assets.find((a) => a.id === 'cash-1');
      expect(cash1).toBeDefined();
      expect(cash1!.value.amount).toBe(0);

      const cash3 = state.assets.find((a) => a.id === 'cash-3');
      expect(cash3).toBeDefined();
      expect(cash3!.value.amount).toBe(350_000);
    });

    it('does not mutate original event objects', () => {
      const events: FinanceEvent[] = [personalLoan2, buyFlatSingleLoan];
      deriveState(events);

      expect(personalLoan2.cash.value.amount).toBe(2_850_000);
    });

    it('returns identical results on consecutive calls', () => {
      const events: FinanceEvent[] = [personalLoan, personalLoan2, buyFlatWithTwoLoans];
      const first = deriveState(events);
      const second = deriveState(events);

      const firstCash1 = first.assets.find((a) => a.id === 'cash-1')!;
      const secondCash1 = second.assets.find((a) => a.id === 'cash-1')!;
      expect(firstCash1.value.amount).toBe(secondCash1.value.amount);

      const firstCash3 = first.assets.find((a) => a.id === 'cash-3')!;
      const secondCash3 = second.assets.find((a) => a.id === 'cash-3')!;
      expect(firstCash3.value.amount).toBe(secondCash3.value.amount);
    });
  });

  describe('combined scenario', () => {
    it('aggregates all event types correctly', () => {
      const state = deriveState([
        mortgage,
        rentalMortgage,
        personalLoan,
        savings,
        familyHouse,
        salary,
        groceries,
      ]);
      expect(state.assets).toHaveLength(5);
      expect(state.liabilities).toHaveLength(3);
      expect(state.incomes).toHaveLength(2);
      expect(state.expenses).toHaveLength(4);
    });
  });
});
