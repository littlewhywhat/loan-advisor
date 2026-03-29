import { monthlyPayment, monthlyPaymentFromMonths, monthsBetween, remainingBalance } from '@/lib/loanCalc';
import { formatMoney, toMonthly } from '@/lib/format';
import type {
  Asset,
  CashAllocation,
  Currency,
  Frequency,
  NewEventInput,
  RepayLoanStrategy,
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

export type RepayLoanFormData = {
  liabilityId: string;
  expenseId: string;
  repaymentAmount: number;
  currency: Currency;
  strategy: RepayLoanStrategy;
  originalPrincipal: number;
  interestRate: number;
  loanStartDate: string;
  loanEndDate: string;
};

export type BuyAssetFormAllocation = {
  cashAssetId: string;
  amount: number;
};

export type BuyAssetFormData = {
  name: string;
  kind: Asset['kind'];
  value: number;
  currency: Currency;
  growthRate: number;
  allocations: BuyAssetFormAllocation[];
};

function uid(): string {
  return crypto.randomUUID();
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function monthsToPayoff(principal: number, annualRate: number, payment: number): number {
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return Math.ceil(principal / payment);
  const ratio = 1 - (principal * r) / payment;
  if (ratio <= 0) return Infinity;
  return Math.ceil(-Math.log(ratio) / Math.log(1 + r));
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

export function buildRepayLoanInput(form: RepayLoanFormData, date: string): NewEventInput {
  const currency = form.currency;
  const totalMonths = monthsBetween(form.loanStartDate, form.loanEndDate);
  const mp = monthlyPaymentFromMonths(form.originalPrincipal, form.interestRate, totalMonths);
  const elapsed = monthsBetween(form.loanStartDate, date);
  const currentBalance = remainingBalance(form.originalPrincipal, form.interestRate, mp, elapsed);
  const newPrincipalAmount = Math.max(0, Math.round(currentBalance - form.repaymentAmount));

  let newEndDate: string;
  let newMp: number;

  if (newPrincipalAmount <= 0) {
    newEndDate = date;
    newMp = 0;
  } else if (form.strategy === 'reduce_payment') {
    newEndDate = form.loanEndDate;
    const remainingMonths = monthsBetween(date, form.loanEndDate);
    newMp = Math.round(monthlyPaymentFromMonths(newPrincipalAmount, form.interestRate, remainingMonths));
  } else {
    newMp = Math.round(mp);
    const n = monthsToPayoff(newPrincipalAmount, form.interestRate, newMp);
    newEndDate = addMonths(date, n);
  }

  return {
    type: 'repay_loan',
    date,
    liabilityId: form.liabilityId,
    expenseId: form.expenseId,
    repaymentAmount: { amount: form.repaymentAmount, currency },
    strategy: form.strategy,
    newPrincipal: { amount: newPrincipalAmount, currency },
    newStartDate: date,
    newEndDate,
    newMonthlyPayment: { amount: newMp, currency },
  };
}

export function buildBuyAssetInput(form: BuyAssetFormData, date: string): NewEventInput {
  const currency = form.currency;
  const allocations: CashAllocation[] = form.allocations
    .filter((a) => a.amount > 0)
    .map((a) => ({
      cashAssetId: a.cashAssetId,
      amount: { amount: a.amount, currency },
    }));

  return {
    type: 'buy_asset',
    date,
    asset: {
      id: uid(),
      name: form.name,
      kind: form.kind,
      value: { amount: form.value, currency },
      growthRate: form.growthRate / 100,
    } as Asset,
    allocations,
  };
}

const TYPE_LABELS: Record<string, string> = {
  add_income: 'Income',
  add_expense: 'Expense',
  add_asset: 'Asset',
  buy_asset: 'Buy Asset',
  take_mortgage: 'Mortgage',
  take_personal_loan: 'Loan',
  repay_loan: 'Repay Loan',
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
    case 'buy_asset':
      return {
        typeLabel,
        name: input.asset.name,
        detail: `${formatMoney(input.asset.value.amount, input.asset.value.currency)} (${input.allocations.length} source${input.allocations.length > 1 ? 's' : ''})`,
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
    case 'repay_loan':
      return {
        typeLabel,
        name: `Repay ${formatMoney(input.repaymentAmount.amount, input.repaymentAmount.currency)}`,
        detail: input.strategy === 'reduce_payment' ? 'lower payment' : 'shorter term',
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
  { value: 'buy_asset', label: 'Buy Asset' },
  { value: 'take_mortgage', label: 'Take Mortgage' },
  { value: 'take_personal_loan', label: 'Take Personal Loan' },
  { value: 'repay_loan', label: 'Repay Loan' },
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

export function emptyBuyAssetForm(): BuyAssetFormData {
  return {
    name: '',
    kind: 'flat',
    value: 0,
    currency: 'CZK',
    growthRate: 3.0,
    allocations: [],
  };
}

export function emptyRepayLoanForm(): RepayLoanFormData {
  return {
    liabilityId: '',
    expenseId: '',
    repaymentAmount: 0,
    currency: 'CZK',
    strategy: 'reduce_payment',
    originalPrincipal: 0,
    interestRate: 0,
    loanStartDate: '',
    loanEndDate: '',
  };
}
