import { Badge, Card, Flex, Heading, Separator, Text } from '@radix-ui/themes';
import { useMemo } from 'react';
import Row from '@/components/Row';
import { useEvents } from '@/context/EventProvider';
import { fmtMoney, toMonthly } from '@/lib/format';

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

export default function DashboardPage() {
  const { derived } = useEvents();

  const metrics = useMemo(() => {
    const totalIncome = derived.incomes.reduce(
      (sum, i) => sum + toMonthly(i.amount.amount, i.frequency),
      0,
    );

    const totalExpenses = derived.expenses.reduce(
      (sum, e) => sum + toMonthly(e.amount.amount, e.frequency),
      0,
    );

    const cashFlow = totalIncome - totalExpenses;

    const totalAssets = derived.assets.reduce(
      (sum, a) => sum + a.value.amount,
      0,
    );

    const totalLiabilities = derived.liabilities.reduce(
      (sum, l) => sum + l.value.amount,
      0,
    );

    const netWorth = totalAssets - totalLiabilities;
    const debtToAsset = totalAssets > 0 ? totalLiabilities / totalAssets : 0;

    return {
      totalIncome,
      totalExpenses,
      cashFlow,
      totalAssets,
      totalLiabilities,
      netWorth,
      debtToAsset,
    };
  }, [derived]);

  const defaultCurrency =
    derived.incomes[0]?.amount.currency ??
    derived.expenses[0]?.amount.currency ??
    'CZK';

  const fmt = (v: number) => fmtMoney({ amount: v, currency: defaultCurrency });

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
          label="Net Worth"
          value={fmt(metrics.netWorth)}
          color={metrics.netWorth >= 0 ? 'green' : 'red'}
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

          {derived.incomes.length > 0 && (
            <>
              <Text size="2" weight="bold" color="gray">
                Income
              </Text>
              {derived.incomes.map((i) => (
                <Row
                  key={i.id}
                  label={i.name}
                  value={`${fmtMoney({ amount: toMonthly(i.amount.amount, i.frequency), currency: i.amount.currency })}/mo`}
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

          {derived.expenses.length > 0 && (
            <>
              <Text size="2" weight="bold" color="gray">
                Expenses
              </Text>
              {derived.expenses.map((e) => (
                <Row
                  key={e.id}
                  label={e.name}
                  value={`${fmtMoney({ amount: toMonthly(e.amount.amount, e.frequency), currency: e.amount.currency })}/mo`}
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
          {derived.assets.length === 0 && (
            <Text size="2" color="gray">
              No assets yet
            </Text>
          )}
          {derived.assets.map((a) => (
            <Flex key={a.id} justify="between" align="center" pl="4">
              <Flex align="center" gap="2">
                <Text size="2" color="gray">
                  {a.name}
                </Text>
                <Badge size="1" variant="soft">
                  {a.kind}
                </Badge>
              </Flex>
              <Text size="2" weight="bold">
                {fmtMoney(a.value)}
              </Text>
            </Flex>
          ))}
          <Row label="Total Assets" value={fmt(metrics.totalAssets)} />

          <Separator size="4" />

          <Text size="2" weight="bold" color="gray">
            Liabilities
          </Text>
          {derived.liabilities.length === 0 && (
            <Text size="2" color="gray">
              No active liabilities
            </Text>
          )}
          {derived.liabilities.map((l) => (
            <Flex key={l.id} justify="between" align="center" pl="4">
              <Flex align="center" gap="2">
                <Text size="2" color="gray">
                  {l.name}
                </Text>
                <Badge size="1" variant="soft">
                  {l.kind}
                </Badge>
              </Flex>
              <Text size="2" weight="bold">
                {fmtMoney(l.value)}
              </Text>
            </Flex>
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
