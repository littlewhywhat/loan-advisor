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
import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { monthlyPayment } from '@/lib/loanCalc';
import {
  buildAddAssetInput,
  buildAddExpenseInput,
  buildAddIncomeInput,
  buildTakeMortgageInput,
  buildTakePersonalLoanInput,
  describeEvent,
  emptyAssetForm,
  emptyExpenseForm,
  emptyIncomeForm,
  emptyMortgageForm,
  emptyPersonalLoanForm,
  EVENT_TYPES,
  type AssetFormData,
  type ExpenseFormData,
  type IncomeFormData,
  type MortgageFormData,
  type PersonalLoanFormData,
  type StrategyEventType,
} from '@/lib/eventBuilders';
import { fmtMoney } from '@/lib/format';
import type { Asset, Currency, Frequency, NewEventInput, Strategy } from '@/types/events';

type Props = {
  strategy: Strategy;
  onAddEvent: (event: NewEventInput) => void;
  onRemoveEvent: (index: number) => void;
  onApply: () => void;
  onDiscard: () => void;
};

const FREQUENCIES: Frequency[] = ['monthly', 'quarterly', 'annually'];
const FREQ_LABELS: Record<Frequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function CurrencySelect({ value, onChange }: { value: Currency; onChange: (v: Currency) => void }) {
  return (
    <Select.Root value={value} onValueChange={(v) => onChange(v as Currency)}>
      <Select.Trigger style={{ width: '100%' }} />
      <Select.Content>
        <Select.Item value="CZK">CZK</Select.Item>
        <Select.Item value="EUR">EUR</Select.Item>
        <Select.Item value="USD">USD</Select.Item>
      </Select.Content>
    </Select.Root>
  );
}

function IncomeFields({
  form,
  onChange,
  date,
  onDateChange,
}: {
  form: IncomeFormData;
  onChange: (f: IncomeFormData) => void;
  date: string;
  onDateChange: (d: string) => void;
}) {
  return (
    <>
      <div>
        <Text size="2" weight="medium" mb="1" asChild><span>Name</span></Text>
        <TextField.Root
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="e.g. Freelance"
        />
      </div>
      <Flex gap="3">
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Amount</span></Text>
          <TextField.Root
            type="number"
            value={form.amount || ''}
            onChange={(e) => onChange({ ...form, amount: Number(e.target.value) || 0 })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Currency</span></Text>
          <CurrencySelect value={form.currency} onChange={(c) => onChange({ ...form, currency: c })} />
        </div>
      </Flex>
      <Flex gap="3">
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Frequency</span></Text>
          <Select.Root
            value={form.frequency}
            onValueChange={(v) => onChange({ ...form, frequency: v as Frequency })}
          >
            <Select.Trigger style={{ width: '100%' }} />
            <Select.Content>
              {FREQUENCIES.map((f) => (
                <Select.Item key={f} value={f}>{FREQ_LABELS[f]}</Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Start Date</span></Text>
          <TextField.Root type="date" value={date} onChange={(e) => onDateChange(e.target.value)} />
        </div>
      </Flex>
    </>
  );
}

function ExpenseFields({
  form,
  onChange,
  date,
  onDateChange,
}: {
  form: ExpenseFormData;
  onChange: (f: ExpenseFormData) => void;
  date: string;
  onDateChange: (d: string) => void;
}) {
  return (
    <>
      <div>
        <Text size="2" weight="medium" mb="1" asChild><span>Name</span></Text>
        <TextField.Root
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="e.g. Childcare"
        />
      </div>
      <Flex gap="3">
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Amount</span></Text>
          <TextField.Root
            type="number"
            value={form.amount || ''}
            onChange={(e) => onChange({ ...form, amount: Number(e.target.value) || 0 })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Currency</span></Text>
          <CurrencySelect value={form.currency} onChange={(c) => onChange({ ...form, currency: c })} />
        </div>
      </Flex>
      <Flex gap="3">
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Frequency</span></Text>
          <Select.Root
            value={form.frequency}
            onValueChange={(v) => onChange({ ...form, frequency: v as Frequency })}
          >
            <Select.Trigger style={{ width: '100%' }} />
            <Select.Content>
              {FREQUENCIES.map((f) => (
                <Select.Item key={f} value={f}>{FREQ_LABELS[f]}</Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Start Date</span></Text>
          <TextField.Root type="date" value={date} onChange={(e) => onDateChange(e.target.value)} />
        </div>
      </Flex>
    </>
  );
}

function AssetFields({
  form,
  onChange,
  date,
  onDateChange,
}: {
  form: AssetFormData;
  onChange: (f: AssetFormData) => void;
  date: string;
  onDateChange: (d: string) => void;
}) {
  return (
    <>
      <div>
        <Text size="2" weight="medium" mb="1" asChild><span>Name</span></Text>
        <TextField.Root
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="e.g. Investment"
        />
      </div>
      <Flex gap="3">
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Kind</span></Text>
          <Select.Root
            value={form.kind}
            onValueChange={(v) => onChange({ ...form, kind: v as Asset['kind'] })}
          >
            <Select.Trigger style={{ width: '100%' }} />
            <Select.Content>
              <Select.Item value="cash">Cash</Select.Item>
              <Select.Item value="flat">Flat</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Value</span></Text>
          <TextField.Root
            type="number"
            value={form.value || ''}
            onChange={(e) => onChange({ ...form, value: Number(e.target.value) || 0 })}
          />
        </div>
      </Flex>
      <Flex gap="3">
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Currency</span></Text>
          <CurrencySelect value={form.currency} onChange={(c) => onChange({ ...form, currency: c })} />
        </div>
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Growth Rate (%/yr)</span></Text>
          <TextField.Root
            type="number"
            step="0.1"
            value={form.growthRate || ''}
            onChange={(e) => onChange({ ...form, growthRate: Number(e.target.value) || 0 })}
          />
        </div>
      </Flex>
      <div>
        <Text size="2" weight="medium" mb="1" asChild><span>Date</span></Text>
        <TextField.Root type="date" value={date} onChange={(e) => onDateChange(e.target.value)} />
      </div>
    </>
  );
}

function MortgageFields({
  form,
  onChange,
}: {
  form: MortgageFormData;
  onChange: (f: MortgageFormData) => void;
}) {
  const mp = useMemo(
    () => monthlyPayment(form.loanValue, form.interestRate / 100, form.termYears),
    [form.loanValue, form.interestRate, form.termYears],
  );

  return (
    <>
      <div>
        <Text size="2" weight="medium" mb="1" asChild><span>Name</span></Text>
        <TextField.Root
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="e.g. Rental Flat"
        />
      </div>
      <Flex gap="3">
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Loan Value</span></Text>
          <TextField.Root
            type="number"
            value={form.loanValue || ''}
            onChange={(e) => onChange({ ...form, loanValue: Number(e.target.value) || 0 })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Down Payment</span></Text>
          <TextField.Root
            type="number"
            value={form.downPayment || ''}
            onChange={(e) => onChange({ ...form, downPayment: Number(e.target.value) || 0 })}
          />
        </div>
      </Flex>
      <Flex gap="3">
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Annual Rate (%)</span></Text>
          <TextField.Root
            type="number"
            step="0.1"
            value={form.interestRate || ''}
            onChange={(e) => onChange({ ...form, interestRate: Number(e.target.value) || 0 })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Currency</span></Text>
          <CurrencySelect value={form.currency} onChange={(c) => onChange({ ...form, currency: c })} />
        </div>
      </Flex>
      <Flex gap="3">
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Start Date</span></Text>
          <TextField.Root
            type="date"
            value={form.startDate}
            onChange={(e) => onChange({ ...form, startDate: e.target.value })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Term (years)</span></Text>
          <TextField.Root
            type="number"
            value={form.termYears || ''}
            onChange={(e) => onChange({ ...form, termYears: Number(e.target.value) || 0 })}
          />
        </div>
      </Flex>
      <div>
        <Text size="2" weight="medium" mb="1" asChild><span>Flat Growth Rate (%/yr)</span></Text>
        <TextField.Root
          type="number"
          step="0.1"
          value={form.growthRate || ''}
          onChange={(e) => onChange({ ...form, growthRate: Number(e.target.value) || 0 })}
        />
      </div>
      {mp > 0 && (
        <Card variant="surface">
          <Flex gap="5">
            <Flex direction="column">
              <Text size="1" color="gray">Monthly Payment</Text>
              <Text size="3" weight="bold">
                {fmtMoney({ amount: Math.round(mp), currency: form.currency })}
              </Text>
            </Flex>
            <Flex direction="column">
              <Text size="1" color="gray">Flat Value</Text>
              <Text size="3" weight="bold">
                {fmtMoney({ amount: form.loanValue + form.downPayment, currency: form.currency })}
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
                checked={form.rental}
                onCheckedChange={(c) =>
                  onChange({
                    ...form,
                    rental: c === true,
                    rentalIncomeName:
                      c === true && !form.rentalIncomeName
                        ? `${form.name} Rent`
                        : form.rentalIncomeName,
                  })
                }
              />
              Rental property
            </Text>
          </Flex>
          {form.rental && (
            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text size="1" weight="medium" asChild><span>Income Name</span></Text>
                <TextField.Root
                  value={form.rentalIncomeName}
                  onChange={(e) => onChange({ ...form, rentalIncomeName: e.target.value })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Text size="1" weight="medium" asChild><span>Monthly Rent</span></Text>
                <TextField.Root
                  type="number"
                  value={form.rentalIncomeAmount || ''}
                  onChange={(e) => onChange({ ...form, rentalIncomeAmount: Number(e.target.value) || 0 })}
                />
              </div>
            </Flex>
          )}
        </Flex>
      </Card>
    </>
  );
}

function PersonalLoanFields({
  form,
  onChange,
}: {
  form: PersonalLoanFormData;
  onChange: (f: PersonalLoanFormData) => void;
}) {
  const mp = useMemo(
    () => monthlyPayment(form.loanValue, form.interestRate / 100, form.termYears),
    [form.loanValue, form.interestRate, form.termYears],
  );

  return (
    <>
      <div>
        <Text size="2" weight="medium" mb="1" asChild><span>Name</span></Text>
        <TextField.Root
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="e.g. Car Loan"
        />
      </div>
      <Flex gap="3">
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Loan Value</span></Text>
          <TextField.Root
            type="number"
            value={form.loanValue || ''}
            onChange={(e) => onChange({ ...form, loanValue: Number(e.target.value) || 0 })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Currency</span></Text>
          <CurrencySelect value={form.currency} onChange={(c) => onChange({ ...form, currency: c })} />
        </div>
      </Flex>
      <Flex gap="3">
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Annual Rate (%)</span></Text>
          <TextField.Root
            type="number"
            step="0.1"
            value={form.interestRate || ''}
            onChange={(e) => onChange({ ...form, interestRate: Number(e.target.value) || 0 })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Text size="2" weight="medium" mb="1" asChild><span>Term (years)</span></Text>
          <TextField.Root
            type="number"
            value={form.termYears || ''}
            onChange={(e) => onChange({ ...form, termYears: Number(e.target.value) || 0 })}
          />
        </div>
      </Flex>
      <div>
        <Text size="2" weight="medium" mb="1" asChild><span>Start Date</span></Text>
        <TextField.Root
          type="date"
          value={form.startDate}
          onChange={(e) => onChange({ ...form, startDate: e.target.value })}
        />
      </div>
      {mp > 0 && (
        <Card variant="surface">
          <Flex direction="column">
            <Text size="1" color="gray">Monthly Payment</Text>
            <Text size="3" weight="bold">
              {fmtMoney({ amount: Math.round(mp), currency: form.currency })}
            </Text>
          </Flex>
        </Card>
      )}
    </>
  );
}

const TYPE_COLORS: Record<string, 'green' | 'red' | 'blue' | 'orange' | 'purple'> = {
  Income: 'green',
  Expense: 'red',
  Asset: 'blue',
  Mortgage: 'orange',
  Loan: 'purple',
};

export default function StrategyPanel({ strategy, onAddEvent, onRemoveEvent, onApply, onDiscard }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eventType, setEventType] = useState<StrategyEventType>('add_income');
  const [date, setDate] = useState(todayStr);
  const [incomeForm, setIncomeForm] = useState(emptyIncomeForm);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);
  const [assetForm, setAssetForm] = useState(emptyAssetForm);
  const [mortgageForm, setMortgageForm] = useState(emptyMortgageForm);
  const [loanForm, setLoanForm] = useState(emptyPersonalLoanForm);
  const [applyOpen, setApplyOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const resetForms = () => {
    setDate(todayStr());
    setIncomeForm(emptyIncomeForm());
    setExpenseForm(emptyExpenseForm());
    setAssetForm(emptyAssetForm());
    setMortgageForm(emptyMortgageForm());
    setLoanForm(emptyPersonalLoanForm());
  };

  const handleSave = () => {
    let input: NewEventInput | null = null;
    switch (eventType) {
      case 'add_income':
        if (!incomeForm.name.trim() || incomeForm.amount <= 0) return;
        input = buildAddIncomeInput(incomeForm, date);
        break;
      case 'add_expense':
        if (!expenseForm.name.trim() || expenseForm.amount <= 0) return;
        input = buildAddExpenseInput(expenseForm, date);
        break;
      case 'add_asset':
        if (!assetForm.name.trim() || assetForm.value <= 0) return;
        input = buildAddAssetInput(assetForm, date);
        break;
      case 'take_mortgage':
        if (!mortgageForm.name.trim() || mortgageForm.loanValue <= 0) return;
        input = buildTakeMortgageInput(mortgageForm);
        break;
      case 'take_personal_loan':
        if (!loanForm.name.trim() || loanForm.loanValue <= 0) return;
        input = buildTakePersonalLoanInput(loanForm);
        break;
    }
    if (input) {
      onAddEvent(input);
      resetForms();
      setDialogOpen(false);
    }
  };

  const hasEvents = strategy.events.length > 0;

  return (
    <>
      <Card>
        <Flex direction="column" gap="3">
          <Flex justify="between" align="center">
            <Heading size="4">Strategy</Heading>
            <Flex gap="2">
              {hasEvents && (
                <>
                  <Button size="1" variant="soft" color="red" onClick={() => setDiscardOpen(true)}>
                    Discard
                  </Button>
                  <Button size="1" variant="soft" color="green" onClick={() => setApplyOpen(true)}>
                    Apply
                  </Button>
                </>
              )}
              <Button size="1" onClick={() => { resetForms(); setDialogOpen(true); }}>
                <Plus size={14} />
                Add Event
              </Button>
            </Flex>
          </Flex>

          {!hasEvents && (
            <Text size="2" color="gray">
              No strategy events yet. Add planned events to see their impact on the simulation.
            </Text>
          )}

          {hasEvents && (
            <Flex direction="column" gap="2">
              {strategy.events.map((event, idx) => {
                const desc = describeEvent(event);
                const key = `${desc.typeLabel}-${desc.name}-${desc.date}-${idx}`;
                return (
                  <Flex key={key} justify="between" align="center" gap="3">
                    <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                      <Badge size="1" color={TYPE_COLORS[desc.typeLabel] ?? 'gray'}>
                        {desc.typeLabel}
                      </Badge>
                      <Text size="2" weight="medium" truncate>
                        {desc.name}
                      </Text>
                      <Text size="2" color="gray">
                        {desc.detail}
                      </Text>
                      <Badge size="1" variant="soft">
                        {desc.date}
                      </Badge>
                    </Flex>
                    <Button size="1" variant="ghost" color="red" onClick={() => onRemoveEvent(idx)}>
                      <Trash2 size={14} />
                    </Button>
                  </Flex>
                );
              })}
            </Flex>
          )}
        </Flex>
      </Card>

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Content maxWidth="520px">
          <Dialog.Title>Add Strategy Event</Dialog.Title>
          <Flex direction="column" gap="3" mt="3">
            <div>
              <Text size="2" weight="medium" mb="1" asChild><span>Event Type</span></Text>
              <Select.Root value={eventType} onValueChange={(v) => setEventType(v as StrategyEventType)}>
                <Select.Trigger style={{ width: '100%' }} />
                <Select.Content>
                  {EVENT_TYPES.map((t) => (
                    <Select.Item key={t.value} value={t.value}>{t.label}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>

            {eventType === 'add_income' && (
              <IncomeFields form={incomeForm} onChange={setIncomeForm} date={date} onDateChange={setDate} />
            )}
            {eventType === 'add_expense' && (
              <ExpenseFields form={expenseForm} onChange={setExpenseForm} date={date} onDateChange={setDate} />
            )}
            {eventType === 'add_asset' && (
              <AssetFields form={assetForm} onChange={setAssetForm} date={date} onDateChange={setDate} />
            )}
            {eventType === 'take_mortgage' && (
              <MortgageFields form={mortgageForm} onChange={setMortgageForm} />
            )}
            {eventType === 'take_personal_loan' && (
              <PersonalLoanFields form={loanForm} onChange={setLoanForm} />
            )}
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">Cancel</Button>
            </Dialog.Close>
            <Button onClick={handleSave}>Add to Strategy</Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <AlertDialog.Root open={applyOpen} onOpenChange={setApplyOpen}>
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>Apply Strategy</AlertDialog.Title>
          <AlertDialog.Description>
            <Flex direction="column" gap="1">
              <Text>This will add {strategy.events.length} event(s) to your data:</Text>
              {strategy.events.map((event) => {
                const desc = describeEvent(event);
                return (
                  <Text key={`${desc.typeLabel}-${desc.name}-${desc.date}`} size="2" color="gray">
                    • {desc.typeLabel}: {desc.name} ({desc.date})
                  </Text>
                );
              })}
            </Flex>
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button color="green" onClick={onApply}>Apply</Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      <AlertDialog.Root open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialog.Content maxWidth="400px">
          <AlertDialog.Title>Discard Strategy</AlertDialog.Title>
          <AlertDialog.Description>
            Discard all {strategy.events.length} strategy event(s)?
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button color="red" onClick={onDiscard}>Discard</Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  );
}
