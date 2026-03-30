import {
  Badge,
  Card,
  Flex,
  Heading,
  Separator,
  Text,
  TextField,
} from '@radix-ui/themes';
import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import StrategyPanel from '@/components/StrategyPanel';
import { useEvents } from '@/context/EventProvider';
import { deriveState } from '@/lib/deriveState';
import { formatMoney } from '@/lib/format';
import {
  runSimulation,
  type MonthSnapshot,
  type SimulatorConfig,
} from '@/lib/simulate';
import { useStrategyStore } from '@/hooks/useStrategyStore';

const SYNC_ID = 'simulator-sync';

function useDefaultConfig(): SimulatorConfig {
  const now = new Date();
  return {
    targetMonth: now.getMonth() + 1,
    targetYear: now.getFullYear() + 20,
    cashReserveGrowthRate: 0,
  };
}

function formatYAxisValue(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

function formatLabel(snapshots: MonthSnapshot[], i: number | string): string {
  const snap = snapshots[Number(i) - 1];
  if (!snap) return '';
  return `${snap.month}/${snap.year}`;
}

type CombinedPoint = MonthSnapshot & {
  strategyValue?: number | null;
};

function mergeForChart(
  baseline: MonthSnapshot[],
  strategy: MonthSnapshot[] | null,
  dataKey: keyof MonthSnapshot,
): CombinedPoint[] {
  return baseline.map((b, i) => ({
    ...b,
    strategyValue: strategy ? (strategy[i]?.[dataKey] as number) ?? null : null,
  }));
}

function SimpleChart({
  title,
  dataKey,
  baseline,
  strategy,
  color,
  showZeroLine,
  selectedMonthIndex,
}: {
  title: string;
  dataKey: keyof MonthSnapshot;
  baseline: MonthSnapshot[];
  strategy: MonthSnapshot[] | null;
  color: string;
  showZeroLine?: boolean;
  selectedMonthIndex: number | null;
}) {
  const data = useMemo(
    () => mergeForChart(baseline, strategy, dataKey),
    [baseline, strategy, dataKey],
  );
  const hasStrategy = strategy != null && strategy.length > 0;

  return (
    <Card>
      <Flex justify="between" align="center" mb="3">
        <Heading size="3">{title}</Heading>
        {hasStrategy && (
          <Flex gap="3" align="center">
            <Flex align="center" gap="1">
              <div style={{ width: 16, height: 2, background: color }} />
              <Text size="1" color="gray">Baseline</Text>
            </Flex>
            <Flex align="center" gap="1">
              <div style={{ width: 16, height: 0, borderTop: `2px dashed ${color}`, opacity: 0.6 }} />
              <Text size="1" color="gray">Strategy</Text>
            </Flex>
          </Flex>
        )}
      </Flex>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} syncId={SYNC_ID}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="monthIndex"
            tickFormatter={(i) => formatLabel(baseline, i)}
            interval={Math.max(Math.floor(baseline.length / 10) - 1, 0)}
          />
          <YAxis tickFormatter={formatYAxisValue} />
          <Tooltip
            formatter={(value, name) => [
              formatMoney(Number(value ?? 0)),
              name === 'strategyValue' ? `${title} (Strategy)` : title,
            ]}
            labelFormatter={(i) => formatLabel(baseline, i)}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            name={title}
            stroke={color}
            dot={false}
            strokeWidth={2}
          />
          {hasStrategy && (
            <Line
              type="monotone"
              dataKey="strategyValue"
              name="strategyValue"
              stroke={color}
              dot={false}
              strokeWidth={2}
              strokeDasharray="6 3"
              opacity={0.6}
            />
          )}
          {showZeroLine && (
            <ReferenceLine y={0} stroke="var(--gray-8)" strokeDasharray="3 3" />
          )}
          {selectedMonthIndex != null && (
            <ReferenceLine
              x={selectedMonthIndex}
              stroke="var(--gray-12)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

function Row({
  label,
  value,
  color,
  indent,
  strikethrough,
  badge,
}: {
  label: string;
  value: string;
  color?: 'green' | 'red' | 'gray';
  indent?: boolean;
  strikethrough?: boolean;
  badge?: string;
}) {
  return (
    <Flex justify="between" align="center" pl={indent ? '4' : '0'}>
      <Flex align="center" gap="2">
        <Text
          size="2"
          color={indent ? 'gray' : undefined}
          style={strikethrough ? { textDecoration: 'line-through', opacity: 0.5 } : undefined}
        >
          {label}
        </Text>
        {badge && (
          <Badge size="1" variant="soft" color="purple">
            {badge}
          </Badge>
        )}
      </Flex>
      <Text
        size="2"
        weight="bold"
        color={color}
        style={strikethrough ? { textDecoration: 'line-through', opacity: 0.5 } : undefined}
      >
        {value}
      </Text>
    </Flex>
  );
}

function SnapshotDetail({ snapshot }: { snapshot: MonthSnapshot }) {
  const fmt = (v: number) => formatMoney(v);

  return (
    <Flex gap="4" wrap="wrap" align="start">
      <Card style={{ flex: '1 1 320px' }}>
        <Flex direction="column" gap="3">
          <Heading size="4">
            Income Statement — {snapshot.month}/{snapshot.year}
          </Heading>

          {snapshot.incomes.length > 0 && (
            <>
              <Text size="2" weight="bold" color="gray">
                Income
              </Text>
              {snapshot.incomes.map((inc) => (
                <Row
                  key={inc.id}
                  label={inc.name}
                  value={`${fmt(inc.monthlyAmount)}/mo`}
                  indent
                  badge={inc.isStrategy ? 'strategy' : undefined}
                />
              ))}
            </>
          )}

          <Row
            label="Total Income"
            value={`${fmt(snapshot.totalIncome)}/mo`}
            color="green"
          />

          <Separator size="4" />

          {snapshot.expenses.length > 0 && (
            <>
              <Text size="2" weight="bold" color="gray">
                Expenses
              </Text>
              {snapshot.expenses.map((exp) => (
                <Row
                  key={exp.id}
                  label={exp.name}
                  value={`${fmt(exp.monthlyAmount)}/mo`}
                  indent
                  strikethrough={!exp.active}
                  badge={exp.isStrategy ? 'strategy' : undefined}
                />
              ))}
            </>
          )}

          <Row
            label="Total Expenses"
            value={`${fmt(snapshot.totalExpenses)}/mo`}
            color="red"
          />

          <Separator size="4" />

          <Row
            label="Monthly Cash Flow"
            value={`${fmt(snapshot.cashFlow)}/mo`}
            color={snapshot.cashFlow >= 0 ? 'green' : 'red'}
          />
        </Flex>
      </Card>

      <Card style={{ flex: '1 1 320px' }}>
        <Flex direction="column" gap="3">
          <Heading size="4">
            Balance Sheet — {snapshot.month}/{snapshot.year}
          </Heading>

          <Text size="2" weight="bold" color="gray">
            Assets
          </Text>
          {snapshot.assets.map((a) => {
            const depleted = a.value === 0;
            const style = depleted ? { textDecoration: 'line-through' as const, opacity: 0.5 } : undefined;
            return (
              <Flex key={a.id} justify="between" align="center" pl="4">
                <Flex align="center" gap="2">
                  <Text size="2" color="gray" style={style}>
                    {a.name}
                  </Text>
                  <Badge size="1" variant="soft">
                    {a.kind}
                  </Badge>
                  {a.isStrategy && (
                    <Badge size="1" variant="soft" color="purple">strategy</Badge>
                  )}
                </Flex>
                <Text size="2" weight="bold" style={style}>
                  {fmt(a.value)}
                </Text>
              </Flex>
            );
          })}
          {snapshot.cashReserve > 0 && (
            <Flex justify="between" align="center" pl="4">
              <Flex align="center" gap="2">
                <Text size="2" color="gray">
                  Cash Reserve
                </Text>
                <Badge size="1" variant="soft" color="blue">
                  reserve
                </Badge>
              </Flex>
              <Text size="2" weight="bold">
                {fmt(snapshot.cashReserve)}
              </Text>
            </Flex>
          )}
          <Row label="Total Assets" value={fmt(snapshot.totalAssets + snapshot.cashReserve)} />

          <Separator size="4" />

          <Text size="2" weight="bold" color="gray">
            Liabilities
          </Text>
          {snapshot.liabilities.map((l) => {
            const paidOff = l.balance === 0;
            const style = paidOff ? { textDecoration: 'line-through' as const, opacity: 0.5 } : undefined;
            return (
              <Flex key={l.id} justify="between" align="center" pl="4">
                <Flex align="center" gap="2">
                  <Text size="2" color="gray" style={style}>
                    {l.name}
                  </Text>
                  <Badge size="1" variant="soft">
                    {l.kind}
                  </Badge>
                  {l.isStrategy && (
                    <Badge size="1" variant="soft" color="purple">strategy</Badge>
                  )}
                </Flex>
                <Text size="2" weight="bold" style={style}>
                  {fmt(l.balance)}
                </Text>
              </Flex>
            );
          })}
          {snapshot.accumulatedDeficit > 0 && (
            <Flex justify="between" align="center" pl="4">
              <Flex align="center" gap="2">
                <Text size="2" color="gray">
                  Accumulated Deficit
                </Text>
                <Badge size="1" variant="soft" color="red">
                  deficit
                </Badge>
              </Flex>
              <Text size="2" weight="bold">
                {fmt(snapshot.accumulatedDeficit)}
              </Text>
            </Flex>
          )}
          <Row
            label="Total Liabilities"
            value={fmt(snapshot.totalLiabilities + snapshot.accumulatedDeficit)}
          />

          <Separator size="4" />

          <Row
            label="Net Worth"
            value={fmt(snapshot.netWorth)}
            color={snapshot.netWorth >= 0 ? 'green' : 'red'}
          />
        </Flex>
      </Card>
    </Flex>
  );
}

function findSnapshotIndex(
  snapshots: MonthSnapshot[],
  month: number,
  year: number,
): number | null {
  const idx = snapshots.findIndex((s) => s.month === month && s.year === year);
  return idx >= 0 ? idx : null;
}

export default function SimulatorPage() {
  const { events, derived, addEvent, mode } = useEvents();
  const {
    strategy,
    addStrategyEvent,
    removeStrategyEvent,
    updateStrategyEvent,
    clearStrategy,
  } = useStrategyStore(mode);

  const defaults = useDefaultConfig();
  const [targetMonth, setTargetMonth] = useState(defaults.targetMonth);
  const [targetYear, setTargetYear] = useState(defaults.targetYear);
  const [cashReserveGrowthRate, setCashReserveGrowthRate] = useState(0);
  const [viewMonth, setViewMonth] = useState(defaults.targetMonth);
  const [viewYear, setViewYear] = useState(defaults.targetYear);

  const config: SimulatorConfig = useMemo(
    () => ({
      targetMonth,
      targetYear,
      cashReserveGrowthRate: cashReserveGrowthRate / 100,
    }),
    [targetMonth, targetYear, cashReserveGrowthRate],
  );

  const result = useMemo(
    () => runSimulation(events, config, strategy.events),
    [events, config, strategy.events],
  );

  const strategyDerived = useMemo(() => {
    if (strategy.events.length === 0) return derived;
    const strategyAsEvents = strategy.events.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      status: 'active' as const,
    })) as import('@/types/events').FinanceEvent[];
    return deriveState([...events, ...strategyAsEvents]);
  }, [events, strategy.events, derived]);

  const hasData = result.baseline.length > 0;
  const hasStrategy = result.strategy != null && result.strategy.length > 0;

  const activeSnapshots = hasStrategy ? (result.strategy ?? result.baseline) : result.baseline;
  const viewIndex = findSnapshotIndex(activeSnapshots, viewMonth, viewYear);
  const selectedSnapshot = viewIndex != null ? activeSnapshots[viewIndex] : null;
  const selectedMonthIndex = selectedSnapshot?.monthIndex ?? null;

  const handleApply = () => {
    for (const event of strategy.events) {
      addEvent(event);
    }
    clearStrategy();
  };

  return (
    <Flex direction="column" gap="5">
      <Heading size="7">Simulator</Heading>

      <Card>
        <Flex direction="column" gap="3">
          <Text size="2" weight="bold" color="gray">
            Projection Range
          </Text>
          <Flex gap="4" wrap="wrap" align="end">
            <Flex direction="column" gap="1" style={{ width: 120 }}>
              <Text size="2" weight="medium">
                Target Month
              </Text>
              <TextField.Root
                type="number"
                min={1}
                max={12}
                value={String(targetMonth)}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v)) setTargetMonth(v);
                }}
                onBlur={() => setTargetMonth((v) => Math.max(1, Math.min(12, v)))}
                onWheel={(e) => (e.target as HTMLElement).blur()}
              />
            </Flex>
            <Flex direction="column" gap="1" style={{ width: 120 }}>
              <Text size="2" weight="medium">
                Target Year
              </Text>
              <TextField.Root
                type="number"
                min={new Date().getFullYear()}
                max={2100}
                value={String(targetYear)}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v)) setTargetYear(v);
                }}
                onBlur={() => setTargetYear((v) => Math.max(new Date().getFullYear(), Math.min(2100, v)))}
                onWheel={(e) => (e.target as HTMLElement).blur()}
              />
            </Flex>
            <Flex direction="column" gap="1" style={{ width: 180 }}>
              <Text size="2" weight="medium">
                Cash Reserve Growth (%)
              </Text>
              <TextField.Root
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={String(cashReserveGrowthRate)}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!Number.isNaN(v)) setCashReserveGrowthRate(v);
                }}
                onBlur={() => setCashReserveGrowthRate((v) => Math.max(0, Math.min(100, v)))}
                onWheel={(e) => (e.target as HTMLElement).blur()}
              />
            </Flex>
          </Flex>

          <Separator size="4" />

          <Text size="2" weight="bold" color="gray">
            View Snapshot
          </Text>
          <Flex gap="4" wrap="wrap" align="end">
            <Flex direction="column" gap="1" style={{ width: 120 }}>
              <Text size="2" weight="medium">
                Month
              </Text>
              <TextField.Root
                type="number"
                min={1}
                max={12}
                value={String(viewMonth)}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v)) setViewMonth(v);
                }}
                onBlur={() => setViewMonth((v) => Math.max(1, Math.min(12, v)))}
                onWheel={(e) => (e.target as HTMLElement).blur()}
              />
            </Flex>
            <Flex direction="column" gap="1" style={{ width: 120 }}>
              <Text size="2" weight="medium">
                Year
              </Text>
              <TextField.Root
                type="number"
                min={new Date().getFullYear()}
                max={2100}
                value={String(viewYear)}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v)) setViewYear(v);
                }}
                onBlur={() => setViewYear((v) => Math.max(new Date().getFullYear(), Math.min(2100, v)))}
                onWheel={(e) => (e.target as HTMLElement).blur()}
              />
            </Flex>
            {viewIndex == null && hasData && (
              <Text size="2" color="red">
                {viewMonth}/{viewYear} is outside the simulation range
              </Text>
            )}
          </Flex>
        </Flex>
      </Card>

      <StrategyPanel
        strategy={strategy}
        events={events}
        liabilities={strategyDerived.liabilities}
        cashAssets={strategyDerived.assets.filter((a): a is import('@/types/events').Cash => a.kind === 'cash')}
        expenses={strategyDerived.expenses}
        baselineSnapshots={result.strategy ?? result.baseline}
        onAddEvent={addStrategyEvent}
        onUpdateEvent={updateStrategyEvent}
        onRemoveEvent={removeStrategyEvent}
        onApply={handleApply}
        onDiscard={clearStrategy}
      />

      {!hasData && (
        <Card>
          <Text size="3" color="gray" align="center">
            Add events to see the simulation projection.
          </Text>
        </Card>
      )}

      {hasData && (
        <>
          <SimpleChart
            title="Net Worth"
            dataKey="netWorth"
            baseline={result.baseline}
            strategy={result.strategy}
            color="var(--accent-9)"
            selectedMonthIndex={selectedMonthIndex}
          />
          <SimpleChart
            title="Monthly Cash Flow"
            dataKey="cashFlow"
            baseline={result.baseline}
            strategy={result.strategy}
            color="var(--green-9)"
            showZeroLine
            selectedMonthIndex={selectedMonthIndex}
          />
          <SimpleChart
            title="Cash Reserve"
            dataKey="cashReserve"
            baseline={result.baseline}
            strategy={result.strategy}
            color="var(--blue-9)"
            selectedMonthIndex={selectedMonthIndex}
          />

          {selectedSnapshot && (
            <>
              <Separator size="4" />
              <SnapshotDetail snapshot={selectedSnapshot} />
            </>
          )}
        </>
      )}
    </Flex>
  );
}
