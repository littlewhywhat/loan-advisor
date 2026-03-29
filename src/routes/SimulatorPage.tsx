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
import { useEvents } from '@/context/EventProvider';
import { formatMoney } from '@/lib/format';
import {
  runSimulation,
  type MonthSnapshot,
  type SimulatorConfig,
} from '@/lib/simulate';

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

function SimpleChart({
  title,
  dataKey,
  snapshots,
  color,
  showZeroLine,
  selectedMonthIndex,
}: {
  title: string;
  dataKey: keyof MonthSnapshot;
  snapshots: MonthSnapshot[];
  color: string;
  showZeroLine?: boolean;
  selectedMonthIndex: number | null;
}) {
  return (
    <Card>
      <Heading size="3" mb="3">
        {title}
      </Heading>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={snapshots} syncId={SYNC_ID}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="monthIndex"
            tickFormatter={(i) => formatLabel(snapshots, i)}
            interval={Math.max(Math.floor(snapshots.length / 10) - 1, 0)}
          />
          <YAxis tickFormatter={formatYAxisValue} />
          <Tooltip
            formatter={(value) => [formatMoney(Number(value ?? 0)), title]}
            labelFormatter={(i) => formatLabel(snapshots, i)}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            name={title}
            stroke={color}
            dot={false}
            strokeWidth={2}
          />
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
}: {
  label: string;
  value: string;
  color?: 'green' | 'red' | 'gray';
  indent?: boolean;
  strikethrough?: boolean;
}) {
  return (
    <Flex justify="between" align="center" pl={indent ? '4' : '0'}>
      <Text
        size="2"
        color={indent ? 'gray' : undefined}
        style={strikethrough ? { textDecoration: 'line-through', opacity: 0.5 } : undefined}
      >
        {label}
      </Text>
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
          {snapshot.assets.map((a) => (
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
                {fmt(a.value)}
              </Text>
            </Flex>
          ))}
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
          {snapshot.liabilities.map((l) => (
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
                {fmt(l.balance)}
              </Text>
            </Flex>
          ))}
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
  const { events } = useEvents();
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
    () => runSimulation(events, config),
    [events, config],
  );

  const hasData = result.snapshots.length > 0;

  const viewIndex = findSnapshotIndex(result.snapshots, viewMonth, viewYear);
  const selectedSnapshot = viewIndex != null ? result.snapshots[viewIndex] : null;
  const selectedMonthIndex = selectedSnapshot?.monthIndex ?? null;

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
                  if (v >= 1 && v <= 12) setTargetMonth(v);
                }}
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
                  if (v >= new Date().getFullYear() && v <= 2100) setTargetYear(v);
                }}
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
                  if (!Number.isNaN(v) && v >= 0 && v <= 100) setCashReserveGrowthRate(v);
                }}
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
                  if (v >= 1 && v <= 12) setViewMonth(v);
                }}
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
                  if (v >= new Date().getFullYear() && v <= 2100) setViewYear(v);
                }}
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
            snapshots={result.snapshots}
            color="var(--accent-9)"
            selectedMonthIndex={selectedMonthIndex}
          />
          <SimpleChart
            title="Monthly Cash Flow"
            dataKey="cashFlow"
            snapshots={result.snapshots}
            color="var(--green-9)"
            showZeroLine
            selectedMonthIndex={selectedMonthIndex}
          />
          <SimpleChart
            title="Cash Reserve"
            dataKey="cashReserve"
            snapshots={result.snapshots}
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
