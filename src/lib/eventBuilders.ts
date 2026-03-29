import { monthlyPayment } from '@/lib/loanCalc';
import { formatMoney, toMonthly } from '@/lib/format';
import type {
  Asset,
  Currency,
  Frequency,
  NewEventInput,
} from '@/types/events';

export type IncomeFormData = {
  name: string;
  amount: number;
  currency: Currency;
  frequency: Frequency;
};

export type ExpenseFormData = {
  name: string;
  amount: number;
  currency: Currency;
  frequency: Frequency;
};

export type AssetFormData = {
  name: string;
  kind: Asset['kind'];
  value: number;
  currency: Currency;
  growthRate: number;
};

export type MortgageFormData = {
  name: string;
  loanValue: number;
  downPayment: number;
  interestRate: number;
  currency: Currency;
  startDate: string;
  termYears: number;
  growthRate: number;
  rental: boolean;
  rentalIncomeName: string;
  rentalIncomeAmount: number;
};

export type PersonalLoanFormData = {
  name: string;
  loanValue: number;
  interestRate: number;
  currency: Currency;
  startDate: string;
  termYears: number;
};

function uid(): string {
  return crypto.randomUUID();
}

function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export function buildAddIncomeInput(form: IncomeFormData, date: string): NewEventInput {
  return {
    type: 'add_income',
    date,
    income: {
      id: uid(),
      name: form.name,
      amount: { amount: form.amount, currency: form.currency },
      frequency: form.frequency,
    },
  };
}

export function buildAddExpenseInput(form: ExpenseFormData, date: string): NewEventInput {
  return {
    type: 'add_expense',
    date,
    expense: {
      id: uid(),
      name: form.name,
      amount: { amount: form.amount, currency: form.currency },
      frequency: form.frequency,
    },
  };
}

export function buildAddAssetInput(form: AssetFormData, date: string): NewEventInput {
  return {
    type: 'add_asset',
    date,
    asset: {
      id: uid(),
      name: form.name,
      kind: form.kind,
      value: { amount: form.value, currency: form.currency },
      growthRate: form.growthRate / 100,
    } as Asset,
  };
}

export function buildTakeMortgageInput(form: MortgageFormData): NewEventInput {
  const rate = form.interestRate / 100;
  const currency = form.currency;
  const endDate = addYears(form.startDate, form.termYears);
  const flatValue = form.loanValue + form.downPayment;
  const mp = Math.round(monthlyPayment(form.loanValue, rate, form.termYears));

  const base = {
    type: 'take_mortgage' as const,
    date: form.startDate,
    mortgage: {
      id: uid(),
      name: `${form.name} Mortgage`,
      kind: 'mortgage' as const,
      value: { amount: form.loanValue, currency },
      interestRate: rate,
      startDate: form.startDate,
      endDate,
      downPayment: { amount: form.downPayment, currency },
    },
    flat: {
      id: uid(),
      name: form.name,
      kind: 'flat' as const,
      value: { amount: flatValue, currency },
      growthRate: form.growthRate / 100,
    },
    expense: {
      id: uid(),
      name: `${form.name} Payment`,
      amount: { amount: mp, currency },
      frequency: 'monthly' as Frequency,
    },
  };

  if (form.rental) {
    return {
      ...base,
      rental: true,
      income: {
        id: uid(),
        name: form.rentalIncomeName || `${form.name} Rent`,
        amount: { amount: form.rentalIncomeAmount, currency },
        frequency: 'monthly' as Frequency,
      },
    };
  }

  return { ...base, rental: false };
}

export function buildTakePersonalLoanInput(form: PersonalLoanFormData): NewEventInput {
  const rate = form.interestRate / 100;
  const currency = form.currency;
  const endDate = addYears(form.startDate, form.termYears);
  const mp = Math.round(monthlyPayment(form.loanValue, rate, form.termYears));

  return {
    type: 'take_personal_loan',
    date: form.startDate,
    loan: {
      id: uid(),
      name: `${form.name} Loan`,
      kind: 'loan' as const,
      value: { amount: form.loanValue, currency },
      interestRate: rate,
      startDate: form.startDate,
      endDate,
    },
    cash: {
      id: uid(),
      name: `${form.name} Cash`,
      kind: 'cash' as const,
      value: { amount: form.loanValue, currency },
      growthRate: 0,
    },
    expense: {
      id: uid(),
      name: `${form.name} Payment`,
      amount: { amount: mp, currency },
      frequency: 'monthly' as const,
    },
  };
}

const TYPE_LABELS: Record<string, string> = {
  add_income: 'Income',
  add_expense: 'Expense',
  add_asset: 'Asset',
  take_mortgage: 'Mortgage',
  take_personal_loan: 'Loan',
};

export function describeEvent(input: NewEventInput): {
  typeLabel: string;
  name: string;
  detail: string;
  date: string;
} {
  const typeLabel = TYPE_LABELS[input.type] ?? input.type;
  switch (input.type) {
    case 'add_income':
      return {
        typeLabel,
        name: input.income.name,
        detail: `${formatMoney(toMonthly(input.income.amount.amount, input.income.frequency), input.income.amount.currency)}/mo`,
        date: input.date,
      };
    case 'add_expense':
      return {
        typeLabel,
        name: input.expense.name,
        detail: `${formatMoney(toMonthly(input.expense.amount.amount, input.expense.frequency), input.expense.amount.currency)}/mo`,
        date: input.date,
      };
    case 'add_asset':
      return {
        typeLabel,
        name: input.asset.name,
        detail: `${formatMoney(input.asset.value.amount, input.asset.value.currency)}`,
        date: input.date,
      };
    case 'take_mortgage':
      return {
        typeLabel,
        name: input.flat.name,
        detail: `${formatMoney(input.mortgage.value.amount, input.mortgage.value.currency)}`,
        date: input.date,
      };
    case 'take_personal_loan':
      return {
        typeLabel,
        name: input.loan.name,
        detail: `${formatMoney(input.loan.value.amount, input.loan.value.currency)}`,
        date: input.date,
      };
    case 'manual_correction':
      return { typeLabel: 'Correction', name: '', detail: '', date: input.date };
  }
}

export const EVENT_TYPES = [
  { value: 'add_income', label: 'Add Income' },
  { value: 'add_expense', label: 'Add Expense' },
  { value: 'add_asset', label: 'Add Asset' },
  { value: 'take_mortgage', label: 'Take Mortgage' },
  { value: 'take_personal_loan', label: 'Take Personal Loan' },
] as const;

export type StrategyEventType = (typeof EVENT_TYPES)[number]['value'];

export function emptyIncomeForm(): IncomeFormData {
  return { name: '', amount: 0, currency: 'CZK', frequency: 'monthly' };
}

export function emptyExpenseForm(): ExpenseFormData {
  return { name: '', amount: 0, currency: 'CZK', frequency: 'monthly' };
}

export function emptyAssetForm(): AssetFormData {
  return { name: '', kind: 'cash', value: 0, currency: 'CZK', growthRate: 0 };
}

export function emptyMortgageForm(): MortgageFormData {
  return {
    name: '',
    loanValue: 0,
    downPayment: 0,
    interestRate: 5.5,
    currency: 'CZK',
    startDate: new Date().toISOString().slice(0, 10),
    termYears: 30,
    growthRate: 3.0,
    rental: false,
    rentalIncomeName: '',
    rentalIncomeAmount: 0,
  };
}

export function emptyPersonalLoanForm(): PersonalLoanFormData {
  return {
    name: '',
    loanValue: 0,
    interestRate: 8.0,
    currency: 'CZK',
    startDate: new Date().toISOString().slice(0, 10),
    termYears: 5,
  };
}
