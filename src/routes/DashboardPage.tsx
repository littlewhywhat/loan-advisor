import { Badge, Card, Flex, Heading, Separator, Text } from '@radix-ui/themes';
import { useMemo } from 'react';
import { useFinance } from '@/context/FinanceProvider';
import { formatMoney, toMonthly } from '@/lib/format';
import type { Loan } from '@/types/finance';

function Row({
  label,
  value,
  color,
  indent,
}: {
  label: string;
  value: string;
  color?: 'green' | 'red' | 'gray';
  indent?: boolean;
}) {
  return (
    <Flex justify="between" align="center" pl={indent ? '4' : '0'}>
      <Text size="2" color={indent ? 'gray' : undefined}>
        {label}
      </Text>
      <Text size="2" weight="bold" color={color}>
        {value}
      </Text>
    </Flex>
  );
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: 'green' | 'red' | 'blue' | 'orange';
}) {
  return (
    <Card style={{ flex: '1 1 180px' }}>
      <Flex direction="column" gap="1">
        <Text size="1" color="gray">
          {label}
        </Text>
        <Text size="5" weight="bold" color={color}>
          {value}
        </Text>
      </Flex>
    </Card>
  );
}

function isLoan(l: { type: string }): l is Loan {
  return l.type === 'loan';
}

export default function DashboardPage() {
  const { store } = useFinance();
  const currency = store.currency;

  const metrics = useMemo(() => {
    const manualIncomes = store.incomes.filter((i) => !i.isPassive);
    const passiveIncomes = store.incomes.filter((i) => i.isPassive);

    const totalManualIncome = manualIncomes.reduce(
      (sum, i) => sum + toMonthly(i.amount, i.frequency),
      0,
    );
    const totalPassiveIncome = passiveIncomes.reduce(
      (sum, i) => sum + toMonthly(i.amount, i.frequency),
      0,
    );
    const totalIncome = totalManualIncome + totalPassiveIncome;

    const manualExpenses = store.expenses.filter(
      (e) => e.category === 'living_expense',
    );
    const debtExpenses = store.expenses.filter(
      (e) => e.category === 'liability',
    );

    const totalManualExpenses = manualExpenses.reduce(
      (sum, e) => sum + toMonthly(e.amount, e.frequency),
      0,
    );
    const totalDebtService = debtExpenses.reduce(
      (sum, e) => sum + toMonthly(e.amount, e.frequency),
      0,
    );
    const totalExpenses = totalManualExpenses + totalDebtService;

    const cashFlow = totalIncome - totalExpenses;

    const totalAssets = store.assets.reduce((sum, a) => sum + a.value, 0);
    const totalLiabilities = store.liabilities
      .filter(isLoan)
      .reduce((sum, l) => sum + l.currentBalance, 0);
    const netWorth = totalAssets - totalLiabilities;
    const debtToAsset = totalAssets > 0 ? totalLiabilities / totalAssets : 0;

    const passiveCoverage =
      totalManualExpenses > 0 ? totalPassiveIncome / totalManualExpenses : 0;

    return {
      manualIncomes,
      passiveIncomes,
      totalManualIncome,
      totalPassiveIncome,
      totalIncome,
      manualExpenses,
      debtExpenses,
      totalManualExpenses,
      totalDebtService,
      totalExpenses,
      cashFlow,
      totalAssets,
      totalLiabilities,
      netWorth,
      debtToAsset,
      passiveCoverage,
    };
  }, [store]);

  const fmt = (v: number) => formatMoney(v, currency);

  const linkedLiabilityFor = (assetId: string) =>
    store.liabilities.find((l) => isLoan(l) && l.linkedAssetId === assetId) as
      | Loan
      | undefined;

  return (
    <Flex direction="column" gap="5" style={{ maxWidth: 720 }}>
      <Heading size="7">Dashboard</Heading>

      <Flex gap="3" wrap="wrap">
        <MetricCard
          label="Monthly Cash Flow"
          value={fmt(metrics.cashFlow)}
          color={metrics.cashFlow >= 0 ? 'green' : 'red'}
        />
        <MetricCard
          label="Passive Income"
          value={fmt(metrics.totalPassiveIncome)}
          color="blue"
        />
        <MetricCard
          label="Passive Coverage"
          value={`${(metrics.passiveCoverage * 100).toFixed(0)}%`}
          color={metrics.passiveCoverage >= 1 ? 'green' : 'orange'}
        />
        <MetricCard
          label="Debt-to-Asset"
          value={`${(metrics.debtToAsset * 100).toFixed(0)}%`}
          color={metrics.debtToAsset > 0.5 ? 'red' : 'green'}
        />
      </Flex>

      <Card>
        <Flex direction="column" gap="3">
          <Heading size="4">Income Statement</Heading>

          {metrics.manualIncomes.length > 0 && (
            <>
              <Text size="2" weight="bold" color="gray">
                Manual Income
              </Text>
              {metrics.manualIncomes.map((i) => (
                <Row
                  key={i.id}
                  label={i.name}
                  value={`${fmt(toMonthly(i.amount, i.frequency))}/mo`}
                  indent
                />
              ))}
            </>
          )}

          {metrics.passiveIncomes.length > 0 && (
            <>
              <Text size="2" weight="bold" color="gray">
                Passive Income
              </Text>
              {metrics.passiveIncomes.map((i) => (
                <Row
                  key={i.id}
                  label={i.name}
                  value={`${fmt(toMonthly(i.amount, i.frequency))}/mo`}
                  indent
                />
              ))}
            </>
          )}

          <Row
            label="Total Income"
            value={`${fmt(metrics.totalIncome)}/mo`}
            color="green"
          />

          <Separator size="4" />

          {metrics.manualExpenses.length > 0 && (
            <>
              <Text size="2" weight="bold" color="gray">
                Living Expenses
              </Text>
              {metrics.manualExpenses.map((e) => (
                <Row
                  key={e.id}
                  label={e.name}
                  value={`${fmt(toMonthly(e.amount, e.frequency))}/mo`}
                  indent
                />
              ))}
            </>
          )}

          {metrics.debtExpenses.length > 0 && (
            <>
              <Text size="2" weight="bold" color="gray">
                Debt Service
              </Text>
              {metrics.debtExpenses.map((e) => (
                <Row
                  key={e.id}
                  label={e.name}
                  value={`${fmt(toMonthly(e.amount, e.frequency))}/mo`}
                  indent
                />
              ))}
            </>
          )}

          <Row
            label="Total Expenses"
            value={`${fmt(metrics.totalExpenses)}/mo`}
            color="red"
          />

          <Separator size="4" />

          <Row
            label="Monthly Cash Flow"
            value={`${fmt(metrics.cashFlow)}/mo`}
            color={metrics.cashFlow >= 0 ? 'green' : 'red'}
          />
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="3">
          <Heading size="4">Balance Sheet</Heading>

          <Text size="2" weight="bold" color="gray">
            Assets
          </Text>
          {store.assets.length === 0 && (
            <Text size="2" color="gray">
              No assets yet
            </Text>
          )}
          {store.assets.map((a) => {
            const linked = linkedLiabilityFor(a.id);
            return (
              <Flex key={a.id} justify="between" align="center" pl="4">
                <Flex align="center" gap="2">
                  <Text size="2" color="gray">
                    {a.name}
                  </Text>
                  <Badge size="1" variant="soft">
                    {a.type}
                  </Badge>
                </Flex>
                <Flex align="center" gap="2">
                  <Text size="2" weight="bold">
                    {fmt(a.value)}
                  </Text>
                  {linked && (
                    <Text size="1" color="gray">
                      (equity {fmt(a.value - linked.currentBalance)})
                    </Text>
                  )}
                </Flex>
              </Flex>
            );
          })}
          <Row label="Total Assets" value={fmt(metrics.totalAssets)} />

          <Separator size="4" />

          <Text size="2" weight="bold" color="gray">
            Liabilities
          </Text>
          {store.liabilities.length === 0 && (
            <Text size="2" color="gray">
              No liabilities yet
            </Text>
          )}
          {store.liabilities.filter(isLoan).map((l) => (
            <Row
              key={l.id}
              label={l.name}
              value={fmt(l.currentBalance)}
              indent
            />
          ))}
          <Row
            label="Total Liabilities"
            value={fmt(metrics.totalLiabilities)}
          />

          <Separator size="4" />

          <Row
            label="Net Worth"
            value={fmt(metrics.netWorth)}
            color={metrics.netWorth >= 0 ? 'green' : 'red'}
          />
        </Flex>
      </Card>
    </Flex>
  );
}
