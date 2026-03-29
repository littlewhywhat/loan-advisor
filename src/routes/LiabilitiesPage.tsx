import {
  AlertDialog,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  Flex,
  Heading,
  Select,
  Text,
  TextField,
} from '@radix-ui/themes';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useEvents } from '@/context/EventProvider';
import { findOwnerEvent, isEventEditable, todayStr } from '@/lib/eventUtils';
import { fmtMoney, formatMoney, formatPct } from '@/lib/format';
import { computeLoanDerived } from '@/lib/loanCalc';
import type {
  Currency,
  FinanceEvent,
  Frequency,
  Liability,
  TakeMortgageEvent,
  TakePersonalLoanEvent,
} from '@/types/events';

function computeMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number,
): number {
  const n = termYears * 12;
  const r = annualRate / 12;
  if (n <= 0 || principal <= 0) return 0;
  if (r === 0) return principal / n;
  return (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1);
}

function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

type MortgageForm = {
  name: string;
  loanValue: number;
  downPayment: number;
  interestRate: string;
  currency: Currency;
  startDate: string;
  termYears: number;
  growthRate: string;
  rental: boolean;
  rentalIncomeName: string;
  rentalIncomeAmount: number;
};

type PersonalLoanForm = {
  name: string;
  loanValue: number;
  interestRate: string;
  currency: Currency;
  startDate: string;
  termYears: number;
};

function yearsBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.round(
    e.getFullYear() - s.getFullYear() + (e.getMonth() - s.getMonth()) / 12,
  );
}

function mortgageEventToForm(event: TakeMortgageEvent): MortgageForm {
  return {
    name: event.flat.name,
    loanValue: event.mortgage.value.amount,
    downPayment: event.mortgage.downPayment.amount,
    interestRate: (event.mortgage.interestRate * 100).toFixed(1),
    currency: event.mortgage.value.currency,
    startDate: event.mortgage.startDate,
    termYears: yearsBetween(event.mortgage.startDate, event.mortgage.endDate),
    growthRate: (event.flat.growthRate * 100).toFixed(1),
    rental: event.rental,
    rentalIncomeName: event.rental ? event.income.name : '',
    rentalIncomeAmount: event.rental ? event.income.amount.amount : 0,
  };
}

function loanEventToForm(event: TakePersonalLoanEvent): PersonalLoanForm {
  return {
    name: event.cash.name.replace(/ Cash$/, ''),
    loanValue: event.loan.value.amount,
    interestRate: (event.loan.interestRate * 100).toFixed(1),
    currency: event.loan.value.currency,
    startDate: event.loan.startDate,
    termYears: yearsBetween(event.loan.startDate, event.loan.endDate),
  };
}

function emptyMortgageForm(): MortgageForm {
  return {
    name: '',
    loanValue: 0,
    downPayment: 0,
    interestRate: '5.5',
    currency: 'CZK',
    startDate: todayStr(),
    termYears: 30,
    growthRate: '3.0',
    rental: false,
    rentalIncomeName: '',
    rentalIncomeAmount: 0,
  };
}

function emptyLoanForm(): PersonalLoanForm {
  return {
    name: '',
    loanValue: 0,
    interestRate: '8.0',
    currency: 'CZK',
    startDate: todayStr(),
    termYears: 5,
  };
}

export default function LiabilitiesPage() {
  const { events, derived, addEvent, updateEvent, archiveEvent } = useEvents();

  const [mortgageDialogOpen, setMortgageDialogOpen] = useState(false);
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);
  const [mortgageForm, setMortgageForm] = useState(emptyMortgageForm);
  const [loanForm, setLoanForm] = useState(emptyLoanForm);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Liability | null>(null);

  const openEditMortgage = (event: TakeMortgageEvent) => {
    setEditingEventId(event.id);
    setMortgageForm(mortgageEventToForm(event));
    setMortgageDialogOpen(true);
  };

  const openEditLoan = (event: TakePersonalLoanEvent) => {
    setEditingEventId(event.id);
    setLoanForm(loanEventToForm(event));
    setLoanDialogOpen(true);
  };

  const mortgageMonthly = useMemo(
    () =>
      computeMonthlyPayment(
        mortgageForm.loanValue,
        Number(mortgageForm.interestRate) / 100,
        mortgageForm.termYears,
      ),
    [mortgageForm.loanValue, mortgageForm.interestRate, mortgageForm.termYears],
  );

  const loanMonthly = useMemo(
    () =>
      computeMonthlyPayment(
        loanForm.loanValue,
        Number(loanForm.interestRate) / 100,
        loanForm.termYears,
      ),
    [loanForm.loanValue, loanForm.interestRate, loanForm.termYears],
  );

  const handleSaveMortgage = () => {
    if (!mortgageForm.name.trim() || mortgageForm.loanValue <= 0) return;
    const rate = Number(mortgageForm.interestRate) / 100;
    const currency = mortgageForm.currency;
    const endDate = addYears(mortgageForm.startDate, mortgageForm.termYears);
    const flatValue = mortgageForm.loanValue + mortgageForm.downPayment;

    const existingEvent = editingEventId
      ? (events.find((e) => e.id === editingEventId) as
          | TakeMortgageEvent
          | undefined)
      : undefined;
    const uid = (existing?: string) => existing ?? crypto.randomUUID();

    const base = {
      type: 'take_mortgage' as const,
      date: mortgageForm.startDate,
      mortgage: {
        id: uid(existingEvent?.mortgage.id),
        name: `${mortgageForm.name} Mortgage`,
        kind: 'mortgage' as const,
        value: { amount: mortgageForm.loanValue, currency },
        interestRate: rate,
        startDate: mortgageForm.startDate,
        endDate,
        downPayment: { amount: mortgageForm.downPayment, currency },
      },
      flat: {
        id: uid(existingEvent?.flat.id),
        name: mortgageForm.name,
        kind: 'flat' as const,
        value: { amount: flatValue, currency },
        growthRate: Number(mortgageForm.growthRate) / 100,
      },
      expense: {
        id: uid(existingEvent?.expense.id),
        name: `${mortgageForm.name} Payment`,
        amount: { amount: Math.round(mortgageMonthly), currency },
        frequency: 'monthly' as Frequency,
      },
    };

    const buildEvent = (): FinanceEvent => {
      if (mortgageForm.rental) {
        const existingIncomeId = existingEvent?.rental
          ? existingEvent.income.id
          : undefined;
        return {
          ...base,
          id: editingEventId ?? '',
          status: 'active',
          rental: true,
          income: {
            id: uid(existingIncomeId),
            name: mortgageForm.rentalIncomeName || `${mortgageForm.name} Rent`,
            amount: { amount: mortgageForm.rentalIncomeAmount, currency },
            frequency: 'monthly' as Frequency,
          },
        };
      }
      return {
        ...base,
        id: editingEventId ?? '',
        status: 'active',
        rental: false,
      };
    };

    if (editingEventId) {
      updateEvent(editingEventId, (prev) => ({
        ...prev,
        ...buildEvent(),
      }));
    } else {
      if (mortgageForm.rental) {
        addEvent({
          ...base,
          rental: true,
          income: {
            id: crypto.randomUUID(),
            name: mortgageForm.rentalIncomeName || `${mortgageForm.name} Rent`,
            amount: { amount: mortgageForm.rentalIncomeAmount, currency },
            frequency: 'monthly' as Frequency,
          },
        });
      } else {
        addEvent({ ...base, rental: false });
      }
    }

    setMortgageDialogOpen(false);
    setMortgageForm(emptyMortgageForm());
    setEditingEventId(null);
  };

  const handleSaveLoan = () => {
    if (!loanForm.name.trim() || loanForm.loanValue <= 0) return;
    const rate = Number(loanForm.interestRate) / 100;
    const currency = loanForm.currency;
    const endDate = addYears(loanForm.startDate, loanForm.termYears);

    const existingEvent = editingEventId
      ? (events.find((e) => e.id === editingEventId) as
          | TakePersonalLoanEvent
          | undefined)
      : undefined;
    const uid = (existing?: string) => existing ?? crypto.randomUUID();

    const eventData = {
      type: 'take_personal_loan' as const,
      date: loanForm.startDate,
      loan: {
        id: uid(existingEvent?.loan.id),
        name: `${loanForm.name} Loan`,
        kind: 'loan' as const,
        value: { amount: loanForm.loanValue, currency },
        interestRate: rate,
        startDate: loanForm.startDate,
        endDate,
      },
      cash: {
        id: uid(existingEvent?.cash.id),
        name: `${loanForm.name} Cash`,
        kind: 'cash' as const,
        value: { amount: loanForm.loanValue, currency },
        growthRate: existingEvent?.cash.growthRate ?? 0,
      },
      expense: {
        id: uid(existingEvent?.expense.id),
        name: `${loanForm.name} Payment`,
        amount: { amount: Math.round(loanMonthly), currency },
        frequency: 'monthly' as const,
      },
    };

    if (editingEventId) {
      updateEvent(editingEventId, (prev) => ({
        ...prev,
        ...eventData,
      }));
    } else {
      addEvent(eventData);
    }

    setLoanDialogOpen(false);
    setLoanForm(emptyLoanForm());
    setEditingEventId(null);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const owner = findOwnerEvent(events, deleteTarget.id);
    if (owner) archiveEvent(owner.id);
    setDeleteTarget(null);
  };

  return (
    <Flex direction="column" gap="5" style={{ maxWidth: 720 }}>
      <Flex justify="between" align="center">
        <Heading size="7">Liabilities</Heading>
        <Flex gap="2">
          <Button
            variant="soft"
            onClick={() => {
              setEditingEventId(null);
              setLoanForm(emptyLoanForm());
              setLoanDialogOpen(true);
            }}
          >
            <Plus size={16} />
            Take Personal Loan
          </Button>
          <Button
            onClick={() => {
              setEditingEventId(null);
              setMortgageForm(emptyMortgageForm());
              setMortgageDialogOpen(true);
            }}
          >
            <Plus size={16} />
            Take Mortgage
          </Button>
        </Flex>
      </Flex>

      {derived.liabilities.length === 0 && (
        <Card>
          <Text size="3" color="gray" align="center">
            No liabilities yet. Take a mortgage or personal loan to get started.
          </Text>
        </Card>
      )}

      {derived.liabilities.map((liability) => {
        const owner = findOwnerEvent(events, liability.id);
        const editable = owner && isEventEditable(owner);
        const loanDerived = computeLoanDerived(
          liability.value.amount,
          liability.interestRate,
          liability.startDate,
          liability.endDate,
        );
        const paidPrincipal =
          liability.value.amount - loanDerived.currentBalance;
        return (
          <Card key={liability.id}>
            <Flex direction="column" gap="2">
              <Flex justify="between" align="center">
                <Flex align="center" gap="2">
                  <Text size="3" weight="bold">
                    {liability.name}
                  </Text>
                  <Badge
                    size="1"
                    color={liability.kind === 'mortgage' ? 'blue' : 'orange'}
                  >
                    {liability.kind === 'mortgage' ? 'Mortgage' : 'Loan'}
                  </Badge>
                  {owner && (
                    <Badge size="1" variant="soft" color="gray">
                      from {owner.type.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </Flex>
                {editable && (
                  <Flex gap="2">
                    <Button
                      size="1"
                      variant="ghost"
                      onClick={() => {
                        if (owner.type === 'take_mortgage')
                          openEditMortgage(owner);
                        else if (owner.type === 'take_personal_loan')
                          openEditLoan(owner);
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="1"
                      variant="ghost"
                      color="red"
                      onClick={() => setDeleteTarget(liability)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </Flex>
                )}
              </Flex>

              <Flex gap="5" wrap="wrap">
                <Flex direction="column">
                  <Text size="1" color="gray">
                    Original
                  </Text>
                  <Text size="2" weight="bold">
                    {fmtMoney(liability.value)}
                  </Text>
                </Flex>
                {paidPrincipal > 0 && (
                  <>
                    <Flex direction="column">
                      <Text size="1" color="gray">
                        Balance
                      </Text>
                      <Text size="2" weight="bold">
                        {formatMoney(
                          loanDerived.currentBalance,
                          liability.value.currency,
                        )}
                      </Text>
                    </Flex>
                    <Flex direction="column">
                      <Text size="1" color="gray">
                        Paid Principal
                      </Text>
                      <Text size="2" weight="bold" color="green">
                        {formatMoney(paidPrincipal, liability.value.currency)}
                      </Text>
                    </Flex>
                  </>
                )}
                <Flex direction="column">
                  <Text size="1" color="gray">
                    Rate
                  </Text>
                  <Text size="2" weight="bold">
                    {formatPct(liability.interestRate)}
                  </Text>
                </Flex>
                {liability.kind === 'mortgage' &&
                  liability.downPayment.amount > 0 && (
                    <Flex direction="column">
                      <Text size="1" color="gray">
                        Down Payment
                      </Text>
                      <Text size="2" weight="bold">
                        {fmtMoney(liability.downPayment)}
                      </Text>
                    </Flex>
                  )}
                <Flex direction="column">
                  <Text size="1" color="gray">
                    Start
                  </Text>
                  <Badge size="1" variant="soft">
                    {liability.startDate}
                  </Badge>
                </Flex>
                <Flex direction="column">
                  <Text size="1" color="gray">
                    End
                  </Text>
                  <Badge size="1" variant="soft">
                    {liability.endDate}
                  </Badge>
                </Flex>
              </Flex>

              {owner && (
                <Flex gap="3" wrap="wrap">
                  {owner.type === 'take_mortgage' && (
                    <>
                      <Flex gap="1" align="center">
                        <Text size="1" color="gray">
                          Flat:
                        </Text>
                        <Badge size="1" variant="soft" color="blue">
                          {owner.flat.name} {fmtMoney(owner.flat.value)}
                        </Badge>
                      </Flex>
                      <Flex gap="1" align="center">
                        <Text size="1" color="gray">
                          Payment:
                        </Text>
                        <Badge size="1" variant="soft" color="orange">
                          {fmtMoney(owner.expense.amount)}/mo
                        </Badge>
                      </Flex>
                      {owner.rental && (
                        <Flex gap="1" align="center">
                          <Text size="1" color="gray">
                            Rent:
                          </Text>
                          <Badge size="1" variant="soft" color="green">
                            {fmtMoney(owner.income.amount)}/mo
                          </Badge>
                        </Flex>
                      )}
                    </>
                  )}
                  {owner.type === 'take_personal_loan' && (
                    <>
                      <Flex gap="1" align="center">
                        <Text size="1" color="gray">
                          Cash:
                        </Text>
                        <Badge size="1" variant="soft" color="green">
                          {owner.cash.name} {fmtMoney(owner.cash.value)}
                        </Badge>
                      </Flex>
                      <Flex gap="1" align="center">
                        <Text size="1" color="gray">
                          Payment:
                        </Text>
                        <Badge size="1" variant="soft" color="orange">
                          {fmtMoney(owner.expense.amount)}/mo
                        </Badge>
                      </Flex>
                    </>
                  )}
                </Flex>
              )}
            </Flex>
          </Card>
        );
      })}

      <Dialog.Root
        open={mortgageDialogOpen}
        onOpenChange={(open) => {
          setMortgageDialogOpen(open);
          if (!open) setEditingEventId(null);
        }}
      >
        <Dialog.Content maxWidth="520px">
          <Dialog.Title>
            {editingEventId ? 'Edit Mortgage' : 'Take Mortgage'}
          </Dialog.Title>

          <Flex direction="column" gap="3" mt="3">
            <div>
              <Text size="2" weight="medium" mb="1" asChild>
                <span>Name</span>
              </Text>
              <TextField.Root
                value={mortgageForm.name}
                onChange={(e) =>
                  setMortgageForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. My Flat"
              />
            </div>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Loan Value</span>
                </Text>
                <TextField.Root
                  type="number"
                  value={mortgageForm.loanValue || ''}
                  onChange={(e) =>
                    setMortgageForm((f) => ({
                      ...f,
                      loanValue: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Down Payment</span>
                </Text>
                <TextField.Root
                  type="number"
                  value={mortgageForm.downPayment || ''}
                  onChange={(e) =>
                    setMortgageForm((f) => ({
                      ...f,
                      downPayment: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </Flex>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Annual Rate (%)</span>
                </Text>
                <TextField.Root
                  type="number"
                  step="0.1"
                  value={mortgageForm.interestRate}
                  onChange={(e) =>
                    setMortgageForm((f) => ({
                      ...f,
                      interestRate: e.target.value,
                    }))
                  }
                />
              </div>
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Currency</span>
                </Text>
                <Select.Root
                  value={mortgageForm.currency}
                  onValueChange={(v) =>
                    setMortgageForm((f) => ({ ...f, currency: v as Currency }))
                  }
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    <Select.Item value="CZK">CZK</Select.Item>
                    <Select.Item value="EUR">EUR</Select.Item>
                    <Select.Item value="USD">USD</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
            </Flex>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Start Date</span>
                </Text>
                <TextField.Root
                  type="date"
                  value={mortgageForm.startDate}
                  onChange={(e) =>
                    setMortgageForm((f) => ({
                      ...f,
                      startDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Term (years)</span>
                </Text>
                <TextField.Root
                  type="number"
                  value={mortgageForm.termYears || ''}
                  onChange={(e) =>
                    setMortgageForm((f) => ({
                      ...f,
                      termYears: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </Flex>

            <div>
              <Text size="2" weight="medium" mb="1" asChild>
                <span>Flat Growth Rate (%/yr)</span>
              </Text>
              <TextField.Root
                type="number"
                step="0.1"
                value={mortgageForm.growthRate}
                onChange={(e) =>
                  setMortgageForm((f) => ({
                    ...f,
                    growthRate: e.target.value,
                  }))
                }
              />
            </div>

            {mortgageMonthly > 0 && (
              <Card variant="surface">
                <Flex gap="5">
                  <Flex direction="column">
                    <Text size="1" color="gray">
                      Monthly Payment
                    </Text>
                    <Text size="3" weight="bold">
                      {fmtMoney({
                        amount: Math.round(mortgageMonthly),
                        currency: mortgageForm.currency,
                      })}
                    </Text>
                  </Flex>
                  <Flex direction="column">
                    <Text size="1" color="gray">
                      Flat Value
                    </Text>
                    <Text size="3" weight="bold">
                      {fmtMoney({
                        amount:
                          mortgageForm.loanValue + mortgageForm.downPayment,
                        currency: mortgageForm.currency,
                      })}
                    </Text>
                  </Flex>
                </Flex>
              </Card>
            )}

            <Card variant="surface">
              <Flex direction="column" gap="2">
                <Flex asChild gap="2" align="center">
                  <Text size="2" weight="bold">
                    <Checkbox
                      checked={mortgageForm.rental}
                      onCheckedChange={(c) =>
                        setMortgageForm((f) => ({
                          ...f,
                          rental: c === true,
                          rentalIncomeName:
                            c === true && !f.rentalIncomeName
                              ? `${f.name} Rent`
                              : f.rentalIncomeName,
                        }))
                      }
                    />
                    Rental property
                  </Text>
                </Flex>
                {mortgageForm.rental && (
                  <Flex gap="3">
                    <div style={{ flex: 1 }}>
                      <Text size="1" weight="medium" asChild>
                        <span>Income Name</span>
                      </Text>
                      <TextField.Root
                        value={mortgageForm.rentalIncomeName}
                        onChange={(e) =>
                          setMortgageForm((f) => ({
                            ...f,
                            rentalIncomeName: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text size="1" weight="medium" asChild>
                        <span>Monthly Rent</span>
                      </Text>
                      <TextField.Root
                        type="number"
                        value={mortgageForm.rentalIncomeAmount || ''}
                        onChange={(e) =>
                          setMortgageForm((f) => ({
                            ...f,
                            rentalIncomeAmount: Number(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  </Flex>
                )}
              </Flex>
            </Card>
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={handleSaveMortgage}>
              {editingEventId ? 'Save' : 'Take Mortgage'}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root
        open={loanDialogOpen}
        onOpenChange={(open) => {
          setLoanDialogOpen(open);
          if (!open) setEditingEventId(null);
        }}
      >
        <Dialog.Content maxWidth="520px">
          <Dialog.Title>
            {editingEventId ? 'Edit Personal Loan' : 'Take Personal Loan'}
          </Dialog.Title>

          <Flex direction="column" gap="3" mt="3">
            <div>
              <Text size="2" weight="medium" mb="1" asChild>
                <span>Name</span>
              </Text>
              <TextField.Root
                value={loanForm.name}
                onChange={(e) =>
                  setLoanForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Car Loan"
              />
            </div>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Loan Value</span>
                </Text>
                <TextField.Root
                  type="number"
                  value={loanForm.loanValue || ''}
                  onChange={(e) =>
                    setLoanForm((f) => ({
                      ...f,
                      loanValue: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Currency</span>
                </Text>
                <Select.Root
                  value={loanForm.currency}
                  onValueChange={(v) =>
                    setLoanForm((f) => ({ ...f, currency: v as Currency }))
                  }
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    <Select.Item value="CZK">CZK</Select.Item>
                    <Select.Item value="EUR">EUR</Select.Item>
                    <Select.Item value="USD">USD</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
            </Flex>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Annual Rate (%)</span>
                </Text>
                <TextField.Root
                  type="number"
                  step="0.1"
                  value={loanForm.interestRate}
                  onChange={(e) =>
                    setLoanForm((f) => ({ ...f, interestRate: e.target.value }))
                  }
                />
              </div>
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Term (years)</span>
                </Text>
                <TextField.Root
                  type="number"
                  value={loanForm.termYears || ''}
                  onChange={(e) =>
                    setLoanForm((f) => ({
                      ...f,
                      termYears: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </Flex>

            <div>
              <Text size="2" weight="medium" mb="1" asChild>
                <span>Start Date</span>
              </Text>
              <TextField.Root
                type="date"
                value={loanForm.startDate}
                onChange={(e) =>
                  setLoanForm((f) => ({ ...f, startDate: e.target.value }))
                }
              />
            </div>

            {loanMonthly > 0 && (
              <Card variant="surface">
                <Flex direction="column">
                  <Text size="1" color="gray">
                    Monthly Payment
                  </Text>
                  <Text size="3" weight="bold">
                    {fmtMoney({
                      amount: Math.round(loanMonthly),
                      currency: loanForm.currency,
                    })}
                  </Text>
                </Flex>
              </Card>
            )}
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={handleSaveLoan}>
              {editingEventId ? 'Save' : 'Take Loan'}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <AlertDialog.Root
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialog.Content maxWidth="400px">
          <AlertDialog.Title>Archive Event</AlertDialog.Title>
          <AlertDialog.Description>
            Archiving <strong>{deleteTarget?.name}</strong> will also remove the
            linked asset, expense, and any rental income. Continue?
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button color="red" onClick={handleDelete}>
                Archive
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Flex>
  );
}
