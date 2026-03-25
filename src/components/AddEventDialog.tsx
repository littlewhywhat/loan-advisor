import {
  Button,
  Checkbox,
  Dialog,
  Flex,
  Select,
  Separator,
  Text,
  TextField,
} from '@radix-ui/themes';
import { useState } from 'react';
import { formatMoney } from '@/lib/format';
import { computeMonthlyPayment } from '@/lib/simulate';
import type { FinanceStore, Loan } from '@/types/finance';
import type { TimelineEvent } from '@/types/simulation';

type Template = 'buy_property' | 'pay_off_loan' | 'invest' | 'salary_change';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: FinanceStore;
  onAdd: (event: TimelineEvent) => void;
};

const TEMPLATES: { key: Template; icon: string; label: string }[] = [
  { key: 'buy_property', icon: '🏠', label: 'Buy Property' },
  { key: 'pay_off_loan', icon: '💰', label: 'Pay Off Loan' },
  { key: 'invest', icon: '📈', label: 'Invest' },
  { key: 'salary_change', icon: '💼', label: 'Salary Change' },
];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Text size="2" weight="medium" mb="1" asChild>
        <span>{label}</span>
      </Text>
      {children}
    </div>
  );
}

export default function AddEventDialog({
  open,
  onOpenChange,
  store,
  onAdd,
}: Props) {
  const [template, setTemplate] = useState<Template>('buy_property');
  const [timingMode, setTimingMode] = useState<'once' | 'recurring'>('once');
  const [month, setMonth] = useState(12);
  const [startMonth, setStartMonth] = useState(1);
  const [endMonth, setEndMonth] = useState<number | ''>('');
  const [frequency, setFrequency] = useState<
    'monthly' | 'quarterly' | 'annually'
  >('monthly');

  const [propName, setPropName] = useState('');
  const [propValue, setPropValue] = useState(0);
  const [downPayment, setDownPayment] = useState(0);
  const [cashAssetId, setCashAssetId] = useState(
    store.assets.find((a) => a.type === 'cash')?.id ?? '',
  );
  const [interestRate, setInterestRate] = useState(4.9);
  const [termYears, setTermYears] = useState(25);
  const [addRent, setAddRent] = useState(false);
  const [rentAmount, setRentAmount] = useState(0);

  const [payOffLoanId, setPayOffLoanId] = useState('');

  const [investLabel, setInvestLabel] = useState('');
  const [investAmount, setInvestAmount] = useState(0);
  const [investFromId, setInvestFromId] = useState(
    store.assets.find((a) => a.type === 'cash')?.id ?? '',
  );
  const [investToId, setInvestToId] = useState('');

  const [salaryIncomeId, setSalaryIncomeId] = useState('');
  const [salaryNewAmount, setSalaryNewAmount] = useState(0);

  const mortgageAmount = propValue - downPayment;
  const mortgageMonthly =
    mortgageAmount > 0 && interestRate > 0 && termYears > 0
      ? computeMonthlyPayment(mortgageAmount, interestRate / 100, termYears)
      : 0;

  const loans = store.liabilities.filter(
    (l): l is Loan => l.type === 'loan' && l.currentBalance > 0,
  );
  const cashAssets = store.assets.filter((a) => a.type === 'cash');

  const handleTemplateChange = (t: Template) => {
    setTemplate(t);
    setTimingMode(t === 'invest' ? 'recurring' : 'once');
  };

  const buildTiming = () =>
    timingMode === 'once'
      ? ({ schedule: 'once' as const, month })
      : ({
          schedule: 'recurring' as const,
          startMonth,
          endMonth: endMonth === '' ? null : endMonth,
          frequency,
        });

  const handleAdd = () => {
    const id = crypto.randomUUID();
    const ts = new Date().toISOString();
    const timing = buildTiming();

    if (template === 'buy_property') {
      const assetId = crypto.randomUUID();
      const liabilityId = crypto.randomUUID();
      const incomeId = crypto.randomUUID();
      const expenseId = crypto.randomUUID();
      const payment = Math.round(mortgageMonthly);

      const mutations: TimelineEvent['mutations'] = [];

      if (cashAssetId && downPayment > 0) {
        mutations.push({
          type: 'adjust_asset_value',
          assetId: cashAssetId,
          delta: -downPayment,
        });
      }

      mutations.push({
        type: 'add_asset',
        asset: {
          id: assetId,
          name: propName,
          type: 'real_estate',
          value: propValue,
          currency: store.currency,
          linkedIncomeIds: addRent ? [incomeId] : [],
          createdAt: ts,
          updatedAt: ts,
        },
      });

      if (mortgageAmount > 0) {
        mutations.push({
          type: 'add_liability',
          liability: {
            id: liabilityId,
            type: 'loan',
            name: `${propName} Mortgage`,
            loanType: 'living_mortgage',
            originalAmount: mortgageAmount,
            currentBalance: mortgageAmount,
            interestRate: interestRate / 100,
            monthlyPayment: payment,
            startDate: '',
            endDate: null,
            linkedAssetId: assetId,
            createdAt: ts,
            updatedAt: ts,
          },
        });
        mutations.push({
          type: 'add_expense',
          expense: {
            id: expenseId,
            name: `${propName} Mortgage`,
            category: 'liability',
            amount: payment,
            frequency: 'monthly',
            isEssential: true,
            currency: store.currency,
            linkedLiabilityId: liabilityId,
            createdAt: ts,
            updatedAt: ts,
          },
        });
      }

      if (addRent && rentAmount > 0) {
        mutations.push({
          type: 'add_income',
          income: {
            id: incomeId,
            name: `${propName} Rent`,
            type: 'rental',
            amount: rentAmount,
            frequency: 'monthly',
            isPassive: true,
            currency: store.currency,
            linkedAssetId: assetId,
            createdAt: ts,
            updatedAt: ts,
          },
        });
      }

      const details = [
        `Asset: +${formatMoney(propValue)}`,
        `Mortgage: ${formatMoney(mortgageAmount)} @ ${interestRate}%`,
        `Payment: -${formatMoney(payment)}/mo`,
      ];
      if (downPayment > 0)
        details.push(`Down payment: -${formatMoney(downPayment)} cash`);
      if (addRent)
        details.push(`Rent income: +${formatMoney(rentAmount)}/mo`);

      onAdd({
        id,
        label: propName || 'Buy Property',
        icon: '🏠',
        details,
        mutations,
        ...timing,
      });
    } else if (template === 'pay_off_loan') {
      const loan = loans.find((l) => l.id === payOffLoanId);
      onAdd({
        id,
        label: `Pay off ${loan?.name ?? 'loan'}`,
        icon: '💰',
        details: ['Pays remaining balance from cash'],
        mutations: [{ type: 'pay_off_loan', liabilityId: payOffLoanId }],
        ...timing,
      });
    } else if (template === 'invest') {
      const fromAsset = store.assets.find((a) => a.id === investFromId);
      const toAsset = store.assets.find((a) => a.id === investToId);
      onAdd({
        id,
        label: investLabel || `Invest into ${toAsset?.name ?? ''}`,
        icon: '📈',
        details: [
          `Move ${formatMoney(investAmount)}/occurrence`,
          `${fromAsset?.name ?? 'cash'} → ${toAsset?.name ?? '?'}`,
        ],
        mutations: [
          {
            type: 'transfer',
            fromAssetId: investFromId,
            toAssetId: investToId,
            amount: investAmount,
          },
        ],
        ...timing,
      });
    } else {
      const income = store.incomes.find((i) => i.id === salaryIncomeId);
      onAdd({
        id,
        label: `${income?.name ?? 'Income'} → ${formatMoney(salaryNewAmount)}`,
        icon: '💼',
        details: [`New amount: ${formatMoney(salaryNewAmount)}/mo`],
        mutations: [
          {
            type: 'update_income',
            incomeId: salaryIncomeId,
            changes: { amount: salaryNewAmount },
          },
        ],
        ...timing,
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="520px">
        <Dialog.Title>Add Event</Dialog.Title>

        <Flex gap="2" wrap="wrap" my="3">
          {TEMPLATES.map((t) => (
            <Button
              key={t.key}
              size="2"
              variant={template === t.key ? 'solid' : 'outline'}
              onClick={() => handleTemplateChange(t.key)}
            >
              {t.icon} {t.label}
            </Button>
          ))}
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3" my="3">
          {template === 'buy_property' && (
            <>
              <Field label="Property name">
                <TextField.Root
                  value={propName}
                  onChange={(e) => setPropName(e.target.value)}
                  placeholder="e.g. Vinohrady Apartment"
                />
              </Field>
              <Flex gap="3">
                <div style={{ flex: 1 }}>
                  <Field label="Property value">
                    <TextField.Root
                      type="number"
                      value={propValue || ''}
                      onChange={(e) =>
                        setPropValue(Number(e.target.value) || 0)
                      }
                    />
                  </Field>
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="Down payment">
                    <TextField.Root
                      type="number"
                      value={downPayment || ''}
                      onChange={(e) =>
                        setDownPayment(Number(e.target.value) || 0)
                      }
                    />
                  </Field>
                </div>
              </Flex>
              {cashAssets.length > 0 && (
                <Field label="Pay from">
                  <Select.Root
                    value={cashAssetId}
                    onValueChange={setCashAssetId}
                  >
                    <Select.Trigger style={{ width: '100%' }} />
                    <Select.Content>
                      {cashAssets.map((a) => (
                        <Select.Item key={a.id} value={a.id}>
                          {a.name} ({formatMoney(a.value)})
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Field>
              )}
              <Flex gap="3">
                <div style={{ flex: 1 }}>
                  <Field label="Interest rate (%)">
                    <TextField.Root
                      type="number"
                      step="0.1"
                      value={interestRate || ''}
                      onChange={(e) =>
                        setInterestRate(Number(e.target.value) || 0)
                      }
                    />
                  </Field>
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="Term (years)">
                    <TextField.Root
                      type="number"
                      value={termYears || ''}
                      onChange={(e) =>
                        setTermYears(Number(e.target.value) || 0)
                      }
                    />
                  </Field>
                </div>
              </Flex>
              {mortgageMonthly > 0 && (
                <Flex justify="between" align="center">
                  <Text size="2" color="gray">
                    Monthly payment
                  </Text>
                  <Text size="2" weight="bold">
                    {formatMoney(Math.round(mortgageMonthly))}
                  </Text>
                </Flex>
              )}
              <Flex align="center" gap="2">
                <Checkbox
                  id="add-rent"
                  checked={addRent}
                  onCheckedChange={(c) => setAddRent(c === true)}
                />
                <Text size="2" asChild>
                  <label htmlFor="add-rent">Add rental income</label>
                </Text>
              </Flex>
              {addRent && (
                <Field label="Monthly rent">
                  <TextField.Root
                    type="number"
                    value={rentAmount || ''}
                    onChange={(e) =>
                      setRentAmount(Number(e.target.value) || 0)
                    }
                  />
                </Field>
              )}
            </>
          )}

          {template === 'pay_off_loan' && (
            <Field label="Loan to pay off">
              <Select.Root
                value={payOffLoanId}
                onValueChange={setPayOffLoanId}
              >
                <Select.Trigger
                  style={{ width: '100%' }}
                  placeholder="Select a loan…"
                />
                <Select.Content>
                  {loans.map((l) => (
                    <Select.Item key={l.id} value={l.id}>
                      {l.name} ({formatMoney(l.currentBalance)} remaining)
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Field>
          )}

          {template === 'invest' && (
            <>
              <Field label="Label">
                <TextField.Root
                  value={investLabel}
                  onChange={(e) => setInvestLabel(e.target.value)}
                  placeholder="e.g. DCA into ETF"
                />
              </Field>
              <Field label="Amount per occurrence">
                <TextField.Root
                  type="number"
                  value={investAmount || ''}
                  onChange={(e) =>
                    setInvestAmount(Number(e.target.value) || 0)
                  }
                />
              </Field>
              <Flex gap="3">
                <div style={{ flex: 1 }}>
                  <Field label="From">
                    <Select.Root
                      value={investFromId}
                      onValueChange={setInvestFromId}
                    >
                      <Select.Trigger style={{ width: '100%' }} />
                      <Select.Content>
                        {store.assets.map((a) => (
                          <Select.Item key={a.id} value={a.id}>
                            {a.name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </Field>
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="Into">
                    <Select.Root
                      value={investToId}
                      onValueChange={setInvestToId}
                    >
                      <Select.Trigger style={{ width: '100%' }} />
                      <Select.Content>
                        {store.assets
                          .filter((a) => a.id !== investFromId)
                          .map((a) => (
                            <Select.Item key={a.id} value={a.id}>
                              {a.name}
                            </Select.Item>
                          ))}
                      </Select.Content>
                    </Select.Root>
                  </Field>
                </div>
              </Flex>
            </>
          )}

          {template === 'salary_change' && (
            <>
              <Field label="Income source">
                <Select.Root
                  value={salaryIncomeId}
                  onValueChange={(v) => {
                    setSalaryIncomeId(v);
                    const inc = store.incomes.find((i) => i.id === v);
                    if (inc) setSalaryNewAmount(inc.amount);
                  }}
                >
                  <Select.Trigger
                    style={{ width: '100%' }}
                    placeholder="Select income…"
                  />
                  <Select.Content>
                    {store.incomes.map((i) => (
                      <Select.Item key={i.id} value={i.id}>
                        {i.name} ({formatMoney(i.amount)}/mo)
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Field>
              <Field label="New amount">
                <TextField.Root
                  type="number"
                  value={salaryNewAmount || ''}
                  onChange={(e) =>
                    setSalaryNewAmount(Number(e.target.value) || 0)
                  }
                />
              </Field>
            </>
          )}
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3" my="3">
          <Text size="2" weight="medium">
            Timing
          </Text>
          <Flex gap="2">
            <Button
              size="1"
              variant={timingMode === 'once' ? 'solid' : 'outline'}
              onClick={() => setTimingMode('once')}
            >
              One-time
            </Button>
            <Button
              size="1"
              variant={timingMode === 'recurring' ? 'solid' : 'outline'}
              onClick={() => setTimingMode('recurring')}
            >
              Recurring
            </Button>
          </Flex>
          {timingMode === 'once' ? (
            <Field label="Month">
              <TextField.Root
                type="number"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value) || 1)}
                min={1}
              />
            </Field>
          ) : (
            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Field label="From month">
                  <TextField.Root
                    type="number"
                    value={startMonth}
                    onChange={(e) =>
                      setStartMonth(Number(e.target.value) || 1)
                    }
                    min={1}
                  />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="To month">
                  <TextField.Root
                    type="number"
                    value={endMonth}
                    onChange={(e) =>
                      setEndMonth(
                        e.target.value === '' ? '' : Number(e.target.value) || 1,
                      )
                    }
                    placeholder="∞"
                  />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Frequency">
                  <Select.Root
                    value={frequency}
                    onValueChange={(v) =>
                      setFrequency(v as typeof frequency)
                    }
                  >
                    <Select.Trigger style={{ width: '100%' }} />
                    <Select.Content>
                      <Select.Item value="monthly">Monthly</Select.Item>
                      <Select.Item value="quarterly">Quarterly</Select.Item>
                      <Select.Item value="annually">Annually</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Field>
              </div>
            </Flex>
          )}
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button onClick={handleAdd}>Add to timeline</Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
