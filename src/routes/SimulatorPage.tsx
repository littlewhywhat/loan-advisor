import {
  Badge,
  Button,
  Card,
  Flex,
  Heading,
  Select,
  Separator,
  Slider,
  Table,
  Text,
} from '@radix-ui/themes';
import { Copy, Import } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFinance } from '@/context/FinanceProvider';
import { formatMoney } from '@/lib/format';
import {
  runSimulation,
  type SimulationResult,
  type StrategyConfig,
  storeToStrategy,
} from '@/lib/simulate';

function emptyStrategy(): StrategyConfig {
  return {
    assets: [],
    loans: [],
    incomes: [],
    expenses: [],
    reinvestTargetId: null,
  };
}

function StrategyPanel({
  label,
  strategy,
  onImport,
  onCloneOther,
  onChangeReinvest,
}: {
  label: string;
  strategy: StrategyConfig;
  onImport: () => void;
  onCloneOther: () => void;
  onChangeReinvest: (id: string | null) => void;
}) {
  return (
    <Card style={{ flex: '1 1 300px' }}>
      <Flex direction="column" gap="3">
        <Flex justify="between" align="center">
          <Heading size="3">{label}</Heading>
          <Flex gap="2">
            <Button size="1" variant="soft" onClick={onImport}>
              <Import size={14} />
              Import Current
            </Button>
            <Button size="1" variant="soft" onClick={onCloneOther}>
              <Copy size={14} />
              Clone Other
            </Button>
          </Flex>
        </Flex>

        <Flex gap="4" wrap="wrap">
          <Text size="1" color="gray">
            {strategy.assets.length} assets
          </Text>
          <Text size="1" color="gray">
            {strategy.loans.length} loans
          </Text>
          <Text size="1" color="gray">
            {strategy.incomes.length} incomes
          </Text>
          <Text size="1" color="gray">
            {strategy.expenses.length} expenses
          </Text>
        </Flex>

        <div>
          <Text size="2" weight="medium" mb="1" asChild>
            <span>Reinvest surplus into</span>
          </Text>
          <Select.Root
            value={strategy.reinvestTargetId ?? '_none'}
            onValueChange={(v) => onChangeReinvest(v === '_none' ? null : v)}
          >
            <Select.Trigger style={{ width: '100%' }} />
            <Select.Content>
              <Select.Item value="_none">No reinvestment</Select.Item>
              {strategy.assets.map((a) => (
                <Select.Item key={a.id} value={a.id}>
                  {a.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
      </Flex>
    </Card>
  );
}

function ComparisonChart({
  title,
  dataKey,
  resultA,
  resultB,
  formatValue,
}: {
  title: string;
  dataKey: keyof (typeof resultA.snapshots)[number];
  resultA: SimulationResult;
  resultB: SimulationResult;
  formatValue?: (v: number) => string;
}) {
  const data = resultA.snapshots.map((snap, i) => ({
    month: snap.month,
    A: snap[dataKey],
    B: resultB.snapshots[i]?.[dataKey] ?? 0,
  }));

  const fmt = formatValue ?? ((v: number) => formatMoney(v));

  return (
    <Card>
      <Heading size="3" mb="3">
        {title}
      </Heading>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickFormatter={(m) => `${Math.floor(m / 12)}y`}
          />
          <YAxis
            tickFormatter={(v) => {
              if (Math.abs(v) >= 1_000_000)
                return `${(v / 1_000_000).toFixed(1)}M`;
              if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
              return String(v);
            }}
          />
          <Tooltip
            formatter={(value, name) => [
              fmt(Number(value ?? 0)),
              `Strategy ${name ?? ''}`,
            ]}
            labelFormatter={(m) => {
              const y = Math.floor(Number(m) / 12);
              const mo = Number(m) % 12;
              return `Year ${y}, Month ${mo}`;
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="A"
            stroke="var(--accent-9)"
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="B"
            stroke="var(--orange-9)"
            dot={false}
            strokeWidth={2}
          />
          {dataKey === 'cashFlow' && (
            <ReferenceLine y={0} stroke="var(--gray-8)" strokeDasharray="3 3" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

const MILESTONES = [5, 10, 15, 20];

function ComparisonTable({
  resultA,
  resultB,
}: {
  resultA: SimulationResult;
  resultB: SimulationResult;
}) {
  return (
    <Card>
      <Heading size="3" mb="3">
        Milestone Comparison
      </Heading>
      <Table.Root size="1" variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Year</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Net Worth A</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Net Worth B</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Cash Flow A</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Cash Flow B</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {MILESTONES.map((yr) => {
            const idx = yr * 12 - 1;
            const a = resultA.snapshots[idx];
            const b = resultB.snapshots[idx];
            if (!a || !b) return null;
            return (
              <Table.Row key={yr}>
                <Table.Cell>{yr}</Table.Cell>
                <Table.Cell>{formatMoney(a.netWorth)}</Table.Cell>
                <Table.Cell>{formatMoney(b.netWorth)}</Table.Cell>
                <Table.Cell>{formatMoney(a.cashFlow)}</Table.Cell>
                <Table.Cell>{formatMoney(b.cashFlow)}</Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>

      <Flex direction="column" gap="1" mt="3">
        <Flex justify="between">
          <Text size="2" color="gray">
            FI Date
          </Text>
          <Flex gap="4">
            <Badge color="blue">
              A: {resultA.fiMonth ? `Month ${resultA.fiMonth}` : 'Not reached'}
            </Badge>
            <Badge color="orange">
              B: {resultB.fiMonth ? `Month ${resultB.fiMonth}` : 'Not reached'}
            </Badge>
          </Flex>
        </Flex>
        <Flex justify="between">
          <Text size="2" color="gray">
            Total Interest Paid
          </Text>
          <Flex gap="4">
            <Text size="2">A: {formatMoney(resultA.totalInterestPaid)}</Text>
            <Text size="2">B: {formatMoney(resultB.totalInterestPaid)}</Text>
          </Flex>
        </Flex>
        <Flex justify="between">
          <Text size="2" color="gray">
            Peak Negative Cash Flow
          </Text>
          <Flex gap="4">
            <Text size="2">A: {formatMoney(resultA.peakNegativeCashFlow)}</Text>
            <Text size="2">B: {formatMoney(resultB.peakNegativeCashFlow)}</Text>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
}

export default function SimulatorPage() {
  const { store } = useFinance();
  const [strategyA, setStrategyA] = useState<StrategyConfig>(emptyStrategy);
  const [strategyB, setStrategyB] = useState<StrategyConfig>(emptyStrategy);
  const [horizon, setHorizon] = useState(20);

  const importCurrent = () => storeToStrategy(store);

  const resultA = useMemo(
    () => runSimulation(strategyA, horizon),
    [strategyA, horizon],
  );
  const resultB = useMemo(
    () => runSimulation(strategyB, horizon),
    [strategyB, horizon],
  );

  const hasData =
    strategyA.assets.length > 0 ||
    strategyA.incomes.length > 0 ||
    strategyB.assets.length > 0 ||
    strategyB.incomes.length > 0;

  return (
    <Flex direction="column" gap="5">
      <Heading size="7">Strategy Simulator</Heading>

      <Flex gap="4" wrap="wrap">
        <StrategyPanel
          label="Strategy A"
          strategy={strategyA}
          onImport={() => setStrategyA(importCurrent())}
          onCloneOther={() => setStrategyA({ ...strategyB })}
          onChangeReinvest={(id) =>
            setStrategyA((s) => ({ ...s, reinvestTargetId: id }))
          }
        />
        <StrategyPanel
          label="Strategy B"
          strategy={strategyB}
          onImport={() => setStrategyB(importCurrent())}
          onCloneOther={() => setStrategyB({ ...strategyA })}
          onChangeReinvest={(id) =>
            setStrategyB((s) => ({ ...s, reinvestTargetId: id }))
          }
        />
      </Flex>

      <Card>
        <Flex direction="column" gap="2">
          <Flex justify="between">
            <Text size="2" weight="medium">
              Projection Horizon
            </Text>
            <Text size="2" weight="bold">
              {horizon} years
            </Text>
          </Flex>
          <Slider
            value={[horizon]}
            onValueChange={(v) => setHorizon(v[0])}
            min={5}
            max={30}
            step={1}
          />
        </Flex>
      </Card>

      {!hasData && (
        <Card>
          <Text size="3" color="gray" align="center">
            Import your current financial state into one or both strategies to
            start comparing.
          </Text>
        </Card>
      )}

      {hasData && (
        <>
          <Separator size="4" />

          <ComparisonChart
            title="Net Worth Over Time"
            dataKey="netWorth"
            resultA={resultA}
            resultB={resultB}
          />

          <ComparisonChart
            title="Monthly Cash Flow"
            dataKey="cashFlow"
            resultA={resultA}
            resultB={resultB}
          />

          <ComparisonChart
            title="Passive Income"
            dataKey="passiveIncome"
            resultA={resultA}
            resultB={resultB}
          />

          <ComparisonTable resultA={resultA} resultB={resultB} />
        </>
      )}
    </Flex>
  );
}
