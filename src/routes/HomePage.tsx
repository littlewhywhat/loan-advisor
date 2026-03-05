import { useMemo, useState } from 'react';
import {
  Badge,
  Card,
  Flex,
  Heading,
  Separator,
  Slider,
  Text,
} from '@radix-ui/themes';
import { computeExpenseLoan } from '@/lib/expenseCalc';

const INVESTMENT = {
  label: 'Dividend ETF',
  yearlyReturn: 0.08,
  taxRate: 0.15,
};

const LOAN_ANNUAL_RATE = 0.05;

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

export default function HomePage() {
  const [expense, setExpense] = useState(3000);
  const [savings, setSavings] = useState(3000);
  const [loanYears, setLoanYears] = useState(10);

  const result = useMemo(
    () =>
      computeExpenseLoan({
        monthlyExpense: expense,
        monthlySavings: savings,
        yearlyReturn: INVESTMENT.yearlyReturn,
        taxRate: INVESTMENT.taxRate,
        loanAnnualRate: LOAN_ANNUAL_RATE,
        loanYears,
      }),
    [expense, savings, loanYears],
  );

  const monthlyNetPct = (result.monthlyNetReturn * 100).toFixed(2);
  const coveragePct = Math.round((result.coveredExpense / expense) * 100);

  return (
    <Flex direction="column" minHeight="100vh" align="center" gap="5" p="6">
      <Heading size="7">Expense → Investment</Heading>

      <Flex direction="column" gap="5" style={{ width: '100%', maxWidth: 560 }}>
        <Card>
          <Flex direction="column" gap="4">
            <Heading size="3">Monthly Budget</Heading>

            <Flex direction="column" gap="2">
              <Flex justify="between">
                <Text size="2" weight="medium">
                  Monthly Expense
                </Text>
                <Text size="2" weight="bold">
                  {formatCZK(expense)}
                </Text>
              </Flex>
              <Slider
                value={[expense]}
                onValueChange={(v) => setExpense(v[0])}
                min={1000}
                max={20000}
                step={1000}
              />
            </Flex>

            <Flex direction="column" gap="2">
              <Flex justify="between">
                <Text size="2" weight="medium">
                  Monthly Savings
                </Text>
                <Text size="2" weight="bold">
                  {formatCZK(savings)}
                </Text>
              </Flex>
              <Slider
                value={[savings]}
                onValueChange={(v) => setSavings(v[0])}
                min={500}
                max={30000}
                step={500}
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
              <Badge>
                Rate: {(LOAN_ANNUAL_RATE * 100).toFixed(0)}%/yr
              </Badge>
            </Flex>

            <Flex direction="column" gap="2">
              <Flex justify="between">
                <Text size="2" weight="medium">
                  Term
                </Text>
                <Text size="2" weight="bold">
                  {loanYears} years
                </Text>
              </Flex>
              <Slider
                value={[loanYears]}
                onValueChange={(v) => setLoanYears(v[0])}
                min={5}
                max={30}
                step={1}
              />
            </Flex>

            <Separator size="4" />

            <Flex direction="column" gap="1">
              <Row label="Loan amount" value={formatCZK(result.loanPrincipal)} />
              <Row
                label="Monthly payment"
                value={formatCZK(result.monthlyLoanPayment)}
              />
              <Row label="from savings" value={formatCZK(savings)} subtle />
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
                  {formatCZK(expense)} ({coveragePct}%)
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
                label="Savings-only time to same amount"
                value={formatDuration(result.savingsOnlyMonths)}
              />
              <Row
                label="Time saved with loan"
                value={`${result.timeSavedYears.toFixed(1)} years`}
                highlight
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
            </Flex>
          </Flex>
        </Card>
      </Flex>
    </Flex>
  );
}
