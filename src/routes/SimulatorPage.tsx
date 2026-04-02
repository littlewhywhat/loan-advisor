import {
  Badge,
  Button,
  Card,
  Flex,
  Heading,
  IconButton,
  Separator,
  Text,
  TextField,
} from '@radix-ui/themes';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, useSyncExternalStore } from 'react';
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
  runMultiStrategySimulation,
  type MonthSnapshot,
  type MultiStrategyResult,
  type SimulatorConfig,
  type StrategyProjection,
} from '@/lib/simulate';
import { useStrategyLibrary } from '@/hooks/useStrategyLibrary';
import { MAX_STRATEGIES } from '@/types/events';
import type { Cash } from '@/types/events';

const SYNC_ID = 'simulator-sync';
const MOBILE_QUERY = '(max-width: 768px)';

function subscribe(cb: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}

function getIsMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function useIsMobile() {
  return useSyncExternalStore(subscribe, getIsMobile, () => false);
}

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

function StrategyColumn({
  projection,
  baseline,
  selectedMonthIndex,
  viewMonth,
  viewYear,
}: {
  projection: StrategyProjection;
  baseline: MonthSnapshot[];
  selectedMonthIndex: number | null;
  viewMonth: number;
  viewYear: number;
}) {
  const viewIndex = findSnapshotIndex(projection.snapshots, viewMonth, viewYear);
  const snapshot = viewIndex != null ? projection.snapshots[viewIndex] : null;

  return (
    <Flex direction="column" gap="4" style={{ flex: '1 1 0', minWidth: 0 }}>
      <Heading size="4" color="purple">{projection.name}</Heading>
      <SimpleChart
        title="Net Worth"
        dataKey="netWorth"
        baseline={baseline}
        strategy={projection.snapshots}
        color="var(--accent-9)"
        selectedMonthIndex={selectedMonthIndex}
      />
      <SimpleChart
        title="Monthly Cash Flow"
        dataKey="cashFlow"
        baseline={baseline}
        strategy={projection.snapshots}
        color="var(--green-9)"
        showZeroLine
        selectedMonthIndex={selectedMonthIndex}
      />
      <SimpleChart
        title="Cash Reserve"
        dataKey="cashReserve"
        baseline={baseline}
        strategy={projection.snapshots}
        color="var(--blue-9)"
        selectedMonthIndex={selectedMonthIndex}
      />
      {snapshot && (
        <>
          <Separator size="4" />
          <SnapshotDetail snapshot={snapshot} />
        </>
      )}
    </Flex>
  );
}

function StrategyListBar({
  strategies,
  activeId,
  onSetActive,
  onAdd,
  onRename,
  onDuplicate,
  onRemove,
}: {
  strategies: { id: string; name: string; events: unknown[] }[];
  activeId: string | null;
  onSetActive: (id: string) => void;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const startRename = (id: string, current: string) => {
    setRenamingId(id);
    setRenameValue(current);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      onRename(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  return (
    <Card>
      <Flex direction="column" gap="3">
        <Flex justify="between" align="center">
          <Heading size="4">Strategies</Heading>
          <Button
            size="1"
            disabled={strategies.length >= MAX_STRATEGIES}
            onClick={() => onAdd(`Strategy ${strategies.length + 1}`)}
          >
            <Plus size={14} />
            New Strategy
          </Button>
        </Flex>

        {strategies.length === 0 && (
          <Text size="2" color="gray">
            No strategies yet. Create one to explore what-if scenarios.
          </Text>
        )}

        {strategies.map((s) => (
          <Flex
            key={s.id}
            justify="between"
            align="center"
            gap="3"
            p="2"
            style={{
              borderRadius: 'var(--radius-2)',
              background: s.id === activeId ? 'var(--accent-a3)' : undefined,
              cursor: 'pointer',
            }}
            onClick={() => onSetActive(s.id)}
          >
            <Flex align="center" gap="2" style={{ minWidth: 0, flex: 1 }}>
              {renamingId === s.id ? (
                <TextField.Root
                  size="1"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  style={{ flex: 1 }}
                />
              ) : (
                <>
                  <Text size="2" weight={s.id === activeId ? 'bold' : 'medium'} truncate>
                    {s.name}
                  </Text>
                  <Badge size="1" variant="soft" color="gray">
                    {s.events.length} event{s.events.length !== 1 ? 's' : ''}
                  </Badge>
                </>
              )}
            </Flex>
            <Flex gap="1" onClick={(e) => e.stopPropagation()}>
              <IconButton size="1" variant="ghost" onClick={() => startRename(s.id, s.name)}>
                <Pencil size={12} />
              </IconButton>
              <IconButton
                size="1"
                variant="ghost"
                disabled={strategies.length >= MAX_STRATEGIES}
                onClick={() => onDuplicate(s.id)}
              >
                <Copy size={12} />
              </IconButton>
              <IconButton size="1" variant="ghost" color="red" onClick={() => onRemove(s.id)}>
                <Trash2 size={12} />
              </IconButton>
            </Flex>
          </Flex>
        ))}
      </Flex>
    </Card>
  );
}

export default function SimulatorPage() {
  const { events, derived, addEvent, mode } = useEvents();
  const {
    strategies,
    activeStrategy,
    addStrategy,
    removeStrategy,
    duplicateStrategy,
    renameStrategy,
    setActive,
    addStrategyEvent,
    removeStrategyEvent,
    updateStrategyEvent,
    clearStrategy,
    applyStrategy,
  } = useStrategyLibrary(mode);

  const isMobile = useIsMobile();

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

  const result: MultiStrategyResult = useMemo(
    () => runMultiStrategySimulation(events, config, strategies),
    [events, config, strategies],
  );

  const strategyDerived = useMemo(() => {
    if (!activeStrategy || activeStrategy.events.length === 0) return derived;
    const strategyAsEvents = activeStrategy.events.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      status: 'active' as const,
    })) as import('@/types/events').FinanceEvent[];
    return deriveState([...events, ...strategyAsEvents]);
  }, [events, activeStrategy, derived]);

  const hasData = result.baseline.length > 0;
  const nonEmptyProjections = result.strategies;

  const activeProjection = activeStrategy
    ? nonEmptyProjections.find((p) => p.id === activeStrategy.id) ?? null
    : null;
  const activeSnapshots = activeProjection ? activeProjection.snapshots : result.baseline;
  const viewIndex = findSnapshotIndex(activeSnapshots, viewMonth, viewYear);
  const selectedSnapshot = viewIndex != null ? activeSnapshots[viewIndex] : null;
  const selectedMonthIndex = selectedSnapshot?.monthIndex ?? null;


  const handleApply = (id: string) => {
    applyStrategy(id, addEvent);
  };

  const handleDiscard = (id: string) => {
    clearStrategy(id);
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

      <StrategyListBar
        strategies={strategies}
        activeId={activeStrategy?.id ?? null}
        onSetActive={setActive}
        onAdd={addStrategy}
        onRename={renameStrategy}
        onDuplicate={duplicateStrategy}
        onRemove={removeStrategy}
      />

      {activeStrategy && (
        <StrategyPanel
          strategy={activeStrategy}
          events={events}
          liabilities={strategyDerived.liabilities}
          cashAssets={strategyDerived.assets.filter((a): a is Cash => a.kind === 'cash')}
          expenses={strategyDerived.expenses}
          baselineSnapshots={activeProjection?.snapshots ?? result.baseline}
          onAddEvent={addStrategyEvent}
          onUpdateEvent={updateStrategyEvent}
          onRemoveEvent={removeStrategyEvent}
          onApply={() => handleApply(activeStrategy.id)}
          onDiscard={() => handleDiscard(activeStrategy.id)}
        />
      )}

      {!hasData && (
        <Card>
          <Text size="3" color="gray" align="center">
            Add events to see the simulation projection.
          </Text>
        </Card>
      )}

      {hasData && nonEmptyProjections.length <= 1 && (
        <>
          <SimpleChart
            title="Net Worth"
            dataKey="netWorth"
            baseline={result.baseline}
            strategy={activeProjection?.snapshots ?? null}
            color="var(--accent-9)"
            selectedMonthIndex={selectedMonthIndex}
          />
          <SimpleChart
            title="Monthly Cash Flow"
            dataKey="cashFlow"
            baseline={result.baseline}
            strategy={activeProjection?.snapshots ?? null}
            color="var(--green-9)"
            showZeroLine
            selectedMonthIndex={selectedMonthIndex}
          />
          <SimpleChart
            title="Cash Reserve"
            dataKey="cashReserve"
            baseline={result.baseline}
            strategy={activeProjection?.snapshots ?? null}
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

      {hasData && nonEmptyProjections.length > 1 && !isMobile && (
        <Flex gap="5" align="start">
          {nonEmptyProjections.map((p) => (
            <StrategyColumn
              key={p.id}
              projection={p}
              baseline={result.baseline}
              selectedMonthIndex={selectedMonthIndex}
              viewMonth={viewMonth}
              viewYear={viewYear}
            />
          ))}
        </Flex>
      )}

      {hasData && nonEmptyProjections.length > 1 && isMobile && activeProjection && (
        <StrategyColumn
          projection={activeProjection}
          baseline={result.baseline}
          selectedMonthIndex={selectedMonthIndex}
          viewMonth={viewMonth}
          viewYear={viewYear}
        />
      )}
    </Flex>
  );
}
