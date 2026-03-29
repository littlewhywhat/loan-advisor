import { describe, expect, it } from 'vitest';
import { deriveState } from './deriveState';
import type {
  AddExpenseEvent,
  AddIncomeEvent,
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
  income: null,
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

  describe('combined scenario', () => {
    it('aggregates all event types correctly', () => {
      const state = deriveState([
        mortgage,
        rentalMortgage,
        personalLoan,
        salary,
        groceries,
      ]);
      expect(state.assets).toHaveLength(3);
      expect(state.liabilities).toHaveLength(3);
      expect(state.incomes).toHaveLength(2);
      expect(state.expenses).toHaveLength(4);
    });
  });
});
