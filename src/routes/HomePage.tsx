import {
  Badge,
  Button,
  Card,
  Flex,
  Heading,
  IconButton,
  Separator,
  Slider,
  Text,
  TextField,
} from '@radix-ui/themes';
import { type KeyboardEvent, useMemo, useState } from 'react';
import { useCalculations } from '@/hooks/useCalculations';
import { computeExpenseLoan } from '@/lib/expenseCalc';

const INVESTMENT = {
  label: 'Dividend ETF',
  yearlyReturn: 0.08,
  taxRate: 0.15,
};

function formatCZK(amount: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDuration(months: number): string {
  if (!Number.isFinite(months)) return '∞';
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} months`;
  if (rem === 0) return `${years} years`;
  return `${years}y ${rem}m`;
}

function Row({
  label,
  value,
  subtle,
  highlight,
}: {
  label: string;
  value: string;
  subtle?: boolean;
  highlight?: boolean;
}) {
  return (
    <Flex justify="between" align="center" pl={subtle ? '4' : '0'}>
      <Text size="2" color={subtle ? 'gray' : undefined}>
        {label}
      </Text>
      <Text
        size="2"
        weight={highlight ? 'bold' : 'medium'}
        color={highlight ? 'green' : undefined}
      >
        {value}
      </Text>
    </Flex>
  );
}

function EditableRate({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEdit = () => {
    if (disabled) return;
    setDraft((value * 100).toFixed(1));
    setEditing(true);
  };

  const confirm = () => {
    const parsed = Number.parseFloat(draft);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 100) {
      onChange(parsed / 100);
    }
    setEditing(false);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') confirm();
    if (e.key === 'Escape') setEditing(false);
  };

  if (editing) {
    return (
      <Flex align="center" gap="1">
        <TextField.Root
          size="1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          style={{ width: 64 }}
          autoFocus
        />
        <Text size="1">%/yr</Text>
        <IconButton size="1" variant="soft" onClick={confirm}>
          ✓
        </IconButton>
      </Flex>
    );
  }

  return (
    <Flex align="center" gap="1">
      <Badge>Rate: {(value * 100).toFixed(1)}%/yr</Badge>
      {!disabled && (
        <IconButton size="1" variant="ghost" onClick={startEdit}>
          ✎
        </IconButton>
      )}
    </Flex>
  );
}

function EditableName({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEdit = () => {
    if (disabled) return;
    setDraft(value);
    setEditing(true);
  };

  const confirm = () => {
    const trimmed = draft.trim();
    if (trimmed.length > 0) {
      onChange(trimmed);
    }
    setEditing(false);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') confirm();
    if (e.key === 'Escape') setEditing(false);
  };

  if (editing) {
    return (
      <Flex align="center" gap="1">
        <TextField.Root
          size="2"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          style={{ width: 200 }}
          autoFocus
        />
        <IconButton size="1" variant="soft" onClick={confirm}>
          ✓
        </IconButton>
      </Flex>
    );
  }

  return (
    <Flex align="center" gap="1">
      <Heading size="4">{value}</Heading>
      {!disabled && (
        <IconButton size="1" variant="ghost" onClick={startEdit}>
          ✎
        </IconButton>
      )}
    </Flex>
  );
}

export default function HomePage() {
  const {
    calculations,
    activeId,
    active,
    setActiveId,
    addCalculation,
    removeCalculation,
    updateInputs,
    toggleLock,
    rename,
  } = useCalculations();

  const { inputs, locked } = active;

  const result = useMemo(
    () =>
      computeExpenseLoan({
        monthlyExpense: inputs.expense,
        monthlySavings: inputs.savings,
        yearlyReturn: INVESTMENT.yearlyReturn,
        taxRate: INVESTMENT.taxRate,
        loanAnnualRate: inputs.loanRate,
        loanYears: inputs.loanYears,
      }),
    [inputs.expense, inputs.savings, inputs.loanRate, inputs.loanYears],
  );

  const monthlyNetPct = (result.monthlyNetReturn * 100).toFixed(2);
  const coveragePct = Math.round(
    (result.coveredExpense / inputs.expense) * 100,
  );

  return (
    <Flex direction="column" minHeight="100vh" align="center" gap="5" p="6">
      <Heading size="7">Expense → Investment</Heading>

      <Flex direction="column" gap="5" style={{ width: '100%', maxWidth: 560 }}>
        <Flex gap="2" wrap="wrap" align="center">
          {calculations.map((calc) => (
            <Button
              key={calc.id}
              variant={calc.id === activeId ? 'solid' : 'soft'}
              size="2"
              onClick={() => setActiveId(calc.id)}
            >
              {calc.name}
              {calc.locked ? ' 🔒' : ''}
            </Button>
          ))}
          <IconButton size="2" variant="soft" onClick={addCalculation}>
            +
          </IconButton>
        </Flex>

        <Flex justify="between" align="center">
          <EditableName
            value={active.name}
            onChange={(name) => rename(activeId, name)}
            disabled={locked}
          />
          <Flex gap="2">
            <IconButton
              size="2"
              variant={locked ? 'solid' : 'soft'}
              onClick={() => toggleLock(activeId)}
            >
              {locked ? '🔒' : '🔓'}
            </IconButton>
            <IconButton
              size="2"
              variant="soft"
              color="red"
              disabled={locked || calculations.length <= 1}
              onClick={() => removeCalculation(activeId)}
            >
              🗑
            </IconButton>
          </Flex>
        </Flex>

        <Card>
          <Flex direction="column" gap="4">
            <Heading size="3">Monthly Budget</Heading>

            <Flex direction="column" gap="2">
              <Flex justify="between">
                <Text size="2" weight="medium">
                  Monthly Expense
                </Text>
                <Text size="2" weight="bold">
                  {formatCZK(inputs.expense)}
                </Text>
              </Flex>
              <Slider
                value={[inputs.expense]}
                onValueChange={(v) => updateInputs(activeId, { expense: v[0] })}
                min={2500}
                max={100000}
                step={2500}
                disabled={locked}
              />
            </Flex>

            <Flex direction="column" gap="2">
              <Flex justify="between">
                <Text size="2" weight="medium">
                  Monthly Savings
                </Text>
                <Text size="2" weight="bold">
                  {formatCZK(inputs.savings)}
                </Text>
              </Flex>
              <Slider
                value={[inputs.savings]}
                onValueChange={(v) => updateInputs(activeId, { savings: v[0] })}
                min={2500}
                max={100000}
                step={2500}
                disabled={locked}
              />
            </Flex>
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="2">
            <Flex align="center" gap="2">
              <Heading size="3">{INVESTMENT.label}</Heading>
              <Badge color="green">Hardcoded</Badge>
            </Flex>
            <Flex gap="4" wrap="wrap">
              <Text size="2">
                Return: {(INVESTMENT.yearlyReturn * 100).toFixed(0)}%/yr
              </Text>
              <Text size="2">
                Tax: {(INVESTMENT.taxRate * 100).toFixed(0)}%
              </Text>
              <Text size="2" weight="bold">
                Net monthly: {monthlyNetPct}%
              </Text>
            </Flex>
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="4">
            <Flex align="center" gap="2">
              <Heading size="3">Loan</Heading>
              <EditableRate
                value={inputs.loanRate}
                onChange={(v) => updateInputs(activeId, { loanRate: v })}
                disabled={locked}
              />
            </Flex>

            <Flex direction="column" gap="2">
              <Flex justify="between">
                <Text size="2" weight="medium">
                  Term
                </Text>
                <Text size="2" weight="bold">
                  {inputs.loanYears} years
                </Text>
              </Flex>
              <Slider
                value={[inputs.loanYears]}
                onValueChange={(v) =>
                  updateInputs(activeId, { loanYears: v[0] })
                }
                min={5}
                max={30}
                step={1}
                disabled={locked}
              />
            </Flex>

            <Separator size="4" />

            <Flex direction="column" gap="1">
              <Row
                label="Loan amount"
                value={formatCZK(result.loanPrincipal)}
              />
              <Row
                label="Monthly payment"
                value={formatCZK(result.monthlyLoanPayment)}
              />
              <Row
                label="from savings"
                value={formatCZK(inputs.savings)}
                subtle
              />
              <Row
                label="from dividends"
                value={formatCZK(result.coveredExpense)}
                subtle
              />
            </Flex>

            {result.isFullyCovered ? (
              <Badge color="green" size="2">
                Expense fully covered by dividends
              </Badge>
            ) : (
              <Flex direction="column" gap="1">
                <Badge color="orange" size="2">
                  Covers {formatCZK(result.coveredExpense)} of{' '}
                  {formatCZK(inputs.expense)} ({coveragePct}%)
                </Badge>
                <Text size="1" color="gray">
                  Save {formatCZK(result.additionalSavingsNeeded)} more/month
                  for full coverage
                </Text>
              </Flex>
            )}
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="3">
            <Heading size="3">Results</Heading>
            <Flex direction="column" gap="1">
              <Row
                label="Investment needed"
                value={formatCZK(result.loanPrincipal)}
              />
              <Row
                label="Monthly payment"
                value={formatCZK(result.monthlyLoanPayment)}
              />
              <Row
                label="Total interest"
                value={formatCZK(result.totalInterest)}
              />
              <Row
                label="Break-even"
                value={formatDuration(result.breakEvenMonths)}
              />
              <Separator size="4" my="2" />
              <Row
                label="Post-loan passive income"
                value={`${formatCZK(result.postLoanMonthlyIncome)}/mo`}
                highlight
              />
              {result.dividendSurplus > 0 && (
                <>
                  <Row
                    label="Extra above expense"
                    value={`${formatCZK(result.dividendSurplus)}/mo`}
                    subtle
                  />
                  <Row
                    label="Extra accumulated per year"
                    value={`${formatCZK(result.dividendSurplusYearly)}/yr`}
                    subtle
                  />
                </>
              )}
              <Separator size="4" my="2" />
              <Row
                label="Total accumulated after loan"
                value={formatCZK(result.totalAccumulated)}
                highlight
              />
              <Row
                label="Savings-only time to same amount"
                value={formatDuration(result.savingsOnlyMonths)}
              />
              <Row
                label="Time saved with loan"
                value={`${result.timeSavedYears.toFixed(1)} years`}
                highlight
              />
            </Flex>
          </Flex>
        </Card>
      </Flex>
    </Flex>
  );
}
