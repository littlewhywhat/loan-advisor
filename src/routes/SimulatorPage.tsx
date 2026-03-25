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
import { Plus, Trash2 } from 'lucide-react';
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
import AddEventDialog from '@/components/AddEventDialog';
import { useFinance } from '@/context/FinanceProvider';
import { formatMoney, formatPct, toMonthly } from '@/lib/format';
import { runSimulation } from '@/lib/simulate';
import type { FinanceStore, Loan } from '@/types/finance';
import {
  DEFAULT_ASSUMPTIONS,
  type Scenario,
  type SimulationResult,
  type TimelineEvent,
} from '@/types/simulation';

function createScenario(name: string): Scenario {
  return {
    id: crypto.randomUUID(),
    name,
    events: [],
    assumptions: { ...DEFAULT_ASSUMPTIONS },
  };
}

function CurrentStateSummary({ store }: { store: FinanceStore }) {
  const totalAssets = store.assets.reduce((s, a) => s + a.value, 0);
  const loans = store.liabilities.filter(
    (l): l is Loan => l.type === 'loan',
  );
  const totalDebt = loans.reduce((s, l) => s + l.currentBalance, 0);
  const netWorth = totalAssets - totalDebt;
  const totalIncome = store.incomes.reduce(
    (s, i) => s + toMonthly(i.amount, i.frequency),
    0,
  );
  const totalExpenses = store.expenses.reduce(
    (s, e) => s + toMonthly(e.amount, e.frequency),
    0,
  );
  const cashFlow = totalIncome - totalExpenses;
  const passiveIncome = store.incomes
    .filter((i) => i.isPassive)
    .reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);

  return (
    <Card>
      <Flex direction="column" gap="1">
        <Text size="1" color="gray">
          Starting from your current financial state (today)
        </Text>
        <Flex gap="5" wrap="wrap">
          <Text size="2">
            Net worth:{' '}
            <Text weight="bold">{formatMoney(Math.round(netWorth))}</Text>
          </Text>
          <Text size="2">
            Cash flow:{' '}
            <Text
              weight="bold"
              color={cashFlow >= 0 ? 'green' : 'red'}
            >
              {formatMoney(Math.round(cashFlow))}/mo
            </Text>
          </Text>
          <Text size="2">
            Assets:{' '}
            <Text weight="bold">{formatMoney(Math.round(totalAssets))}</Text>
          </Text>
          <Text size="2">
            Debt:{' '}
            <Text weight="bold">{formatMoney(Math.round(totalDebt))}</Text>
          </Text>
          <Text size="2">
            Passive:{' '}
            <Text weight="bold">
              {formatMoney(Math.round(passiveIncome))}/mo
            </Text>
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
}

function EventCard({
  event,
  onRemove,
}: {
  event: TimelineEvent;
  onRemove: () => void;
}) {
  const scheduleLabel =
    event.schedule === 'once'
      ? `Month ${event.month}`
      : `Month ${event.startMonth} → ${event.endMonth ?? '∞'}, ${event.frequency}`;

  return (
    <div>
      <Text size="1" color="gray" mb="1" asChild>
        <div>{scheduleLabel}</div>
      </Text>
      <Card>
        <Flex justify="between" align="start" gap="2">
          <Flex direction="column" gap="1">
            <Text size="2" weight="bold">
              {event.icon} {event.label}
            </Text>
            {event.details.map((d) => (
              <Text key={d} size="1" color="gray">
                {d}
              </Text>
            ))}
          </Flex>
          <Button size="1" variant="ghost" color="red" onClick={onRemove}>
            <Trash2 size={14} />
          </Button>
        </Flex>
      </Card>
    </div>
  );
}

function ScenarioPanel({
  scenario,
  onAddEvent,
  onRemoveEvent,
}: {
  scenario: Scenario;
  onAddEvent: () => void;
  onRemoveEvent: (eventId: string) => void;
}) {
  const sorted = [...scenario.events].sort((a, b) => {
    const aM = a.schedule === 'once' ? a.month : a.startMonth;
    const bM = b.schedule === 'once' ? b.month : b.startMonth;
    return aM - bM;
  });

  return (
    <Flex
      direction="column"
      gap="3"
      style={{ flex: '1 1 300px', minWidth: 0 }}
    >
      <Heading size="4">{scenario.name}</Heading>

      {sorted.length === 0 && (
        <Text size="2" color="gray">
          No events — current state projected forward.
        </Text>
      )}

      {sorted.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          onRemove={() => onRemoveEvent(event.id)}
        />
      ))}

      <Button variant="soft" onClick={onAddEvent}>
        <Plus size={14} /> Add event
      </Button>
    </Flex>
  );
}

function ComparisonChart({
  title,
  dataKey,
  resultA,
  resultB,
  labelA,
  labelB,
}: {
  title: string;
  dataKey: keyof SimulationResult['steps'][number]['summary'];
  resultA: SimulationResult;
  resultB: SimulationResult;
  labelA: string;
  labelB: string;
}) {
  const data = resultA.steps.map((step, i) => ({
    month: step.month,
    A: step.summary[dataKey],
    B: resultB.steps[i]?.summary[dataKey] ?? 0,
  }));

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
              formatMoney(Number(value ?? 0)),
              name === 'A' ? labelA : labelB,
            ]}
            labelFormatter={(m) => {
              const y = Math.floor(Number(m) / 12);
              const mo = Number(m) % 12;
              return `Year ${y}, Month ${mo}`;
            }}
          />
          <Legend
            formatter={(name) => (name === 'A' ? labelA : labelB)}
          />
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
            <ReferenceLine
              y={0}
              stroke="var(--gray-8)"
              strokeDasharray="3 3"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  indent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  indent?: boolean;
}) {
  return (
    <Flex justify="between" pl={indent ? '3' : '0'}>
      <Text size="2" color={indent ? 'gray' : undefined}>
        {label}
      </Text>
      <Text size="2" weight={bold ? 'bold' : 'medium'}>
        {value}
      </Text>
    </Flex>
  );
}

function SnapshotColumn({
  label,
  state,
  summary,
}: {
  label: string;
  state: FinanceStore;
  summary: SimulationResult['steps'][number]['summary'];
}) {
  const loans = state.liabilities.filter(
    (l): l is Loan => l.type === 'loan',
  );
  const freqLabel = (f: string) =>
    f === 'monthly' ? 'mo' : f === 'quarterly' ? 'qt' : 'yr';

  return (
    <Flex
      direction="column"
      gap="2"
      style={{ flex: '1 1 280px', minWidth: 0 }}
    >
      <Text size="3" weight="bold">
        {label}
      </Text>

      <SummaryRow
        label="Net worth"
        value={formatMoney(summary.netWorth)}
        bold
      />
      <SummaryRow
        label="Cash flow"
        value={`${formatMoney(summary.cashFlow)}/mo`}
      />
      <SummaryRow
        label="Passive income"
        value={`${formatMoney(summary.passiveIncome)}/mo`}
      />
      <SummaryRow label="DTI" value={formatPct(summary.dti)} />
      <SummaryRow
        label="Can borrow"
        value={`~${formatMoney(summary.maxBorrowable)}`}
      />

      <Separator size="4" />
      <Text size="2" weight="bold" color="gray">
        Assets
      </Text>
      {state.assets.map((a) => (
        <SummaryRow
          key={a.id}
          label={a.name}
          value={formatMoney(Math.round(a.value))}
          indent
        />
      ))}

      <Separator size="4" />
      <Text size="2" weight="bold" color="gray">
        Liabilities
      </Text>
      {loans.length === 0 && (
        <Text size="1" color="gray">
          None
        </Text>
      )}
      {loans.map((l) => (
        <SummaryRow
          key={l.id}
          label={l.name}
          value={
            l.currentBalance > 0
              ? formatMoney(Math.round(l.currentBalance))
              : 'Paid off'
          }
          indent
        />
      ))}

      <Separator size="4" />
      <Text size="2" weight="bold" color="gray">
        Incomes
      </Text>
      {state.incomes.map((i) => (
        <SummaryRow
          key={i.id}
          label={i.name}
          value={`${formatMoney(i.amount)}/${freqLabel(i.frequency)}`}
          indent
        />
      ))}

      <Separator size="4" />
      <Text size="2" weight="bold" color="gray">
        Expenses
      </Text>
      {state.expenses.map((e) => (
        <SummaryRow
          key={e.id}
          label={e.name}
          value={`${formatMoney(e.amount)}/${freqLabel(e.frequency)}`}
          indent
        />
      ))}
    </Flex>
  );
}

function SnapshotSection({
  month,
  onMonthChange,
  maxMonth,
  stepA,
  stepB,
  labelA,
  labelB,
}: {
  month: number;
  onMonthChange: (m: number) => void;
  maxMonth: number;
  stepA: SimulationResult['steps'][number];
  stepB: SimulationResult['steps'][number];
  labelA: string;
  labelB: string;
}) {
  const yr = Math.floor(month / 12);
  const mo = month % 12;

  return (
    <Card>
      <Heading size="3" mb="3">
        Snapshot
      </Heading>
      <Flex direction="column" gap="2" mb="4">
        <Flex justify="between">
          <Text size="2" weight="medium">
            Month
          </Text>
          <Text size="2" weight="bold">
            Month {month} (Year {yr}
            {mo > 0 ? `, Month ${mo}` : ''})
          </Text>
        </Flex>
        <Slider
          value={[month]}
          onValueChange={(v) => onMonthChange(v[0])}
          min={1}
          max={maxMonth}
          step={1}
        />
      </Flex>

      <Flex gap="5" wrap="wrap">
        <SnapshotColumn
          label={labelA}
          state={stepA.state}
          summary={stepA.summary}
        />
        <SnapshotColumn
          label={labelB}
          state={stepB.state}
          summary={stepB.summary}
        />
      </Flex>
    </Card>
  );
}

function MilestonesTable({
  resultA,
  resultB,
  labelA,
  labelB,
  horizon,
}: {
  resultA: SimulationResult;
  resultB: SimulationResult;
  labelA: string;
  labelB: string;
  horizon: number;
}) {
  const milestones = [5, 10, 15, 20, 25, 30].filter((y) => y <= horizon);

  return (
    <Card>
      <Heading size="3" mb="3">
        Milestones
      </Heading>
      <Table.Root size="1" variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Year</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>
              Net Worth {labelA}
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>
              Net Worth {labelB}
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Δ (B−A)</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {milestones.map((yr) => {
            const idx = yr * 12 - 1;
            const a = resultA.steps[idx]?.summary;
            const b = resultB.steps[idx]?.summary;
            if (!a || !b) return null;
            const delta = b.netWorth - a.netWorth;
            return (
              <Table.Row key={yr}>
                <Table.Cell>{yr}</Table.Cell>
                <Table.Cell>{formatMoney(a.netWorth)}</Table.Cell>
                <Table.Cell>{formatMoney(b.netWorth)}</Table.Cell>
                <Table.Cell>
                  <Text color={delta >= 0 ? 'green' : 'red'}>
                    {delta >= 0 ? '+' : ''}
                    {formatMoney(delta)}
                  </Text>
                </Table.Cell>
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
              {labelA}:{' '}
              {resultA.fiMonth
                ? `Month ${resultA.fiMonth}`
                : 'Not reached'}
            </Badge>
            <Badge color="orange">
              {labelB}:{' '}
              {resultB.fiMonth
                ? `Month ${resultB.fiMonth}`
                : 'Not reached'}
            </Badge>
          </Flex>
        </Flex>
        <Flex justify="between">
          <Text size="2" color="gray">
            Total Interest Paid
          </Text>
          <Flex gap="4">
            <Text size="2">
              {labelA}: {formatMoney(resultA.totalInterestPaid)}
            </Text>
            <Text size="2">
              {labelB}: {formatMoney(resultB.totalInterestPaid)}
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
}

export default function SimulatorPage() {
  const { store } = useFinance();
  const [scenarios, setScenarios] = useState<Scenario[]>([
    createScenario('Baseline'),
    createScenario('Scenario B'),
  ]);
  const [compareA, setCompareA] = useState(0);
  const [compareB, setCompareB] = useState(1);
  const [horizon, setHorizon] = useState(20);
  const [snapshotMonth, setSnapshotMonth] = useState(60);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [addEventTarget, setAddEventTarget] = useState(0);
  const [dialogKey, setDialogKey] = useState(0);

  const scenarioA = scenarios[compareA];
  const scenarioB = scenarios[compareB];

  const resultA = useMemo(
    () => runSimulation(store, scenarioA, horizon),
    [store, scenarioA, horizon],
  );
  const resultB = useMemo(
    () => runSimulation(store, scenarioB, horizon),
    [store, scenarioB, horizon],
  );

  const maxMonth = horizon * 12;
  const clampedSnapshot = Math.min(snapshotMonth, maxMonth);
  const stepA = resultA.steps[clampedSnapshot - 1];
  const stepB = resultB.steps[clampedSnapshot - 1];

  const openAddEvent = (scenarioIndex: number) => {
    setAddEventTarget(scenarioIndex);
    setDialogKey((k) => k + 1);
    setAddEventOpen(true);
  };

  const handleAddEvent = (event: TimelineEvent) => {
    setScenarios((prev) =>
      prev.map((s, i) =>
        i === addEventTarget ? { ...s, events: [...s.events, event] } : s,
      ),
    );
  };

  const removeEvent = (scenarioIndex: number, eventId: string) => {
    setScenarios((prev) =>
      prev.map((s, i) =>
        i === scenarioIndex
          ? { ...s, events: s.events.filter((e) => e.id !== eventId) }
          : s,
      ),
    );
  };

  const addScenario = () => {
    const name = `Scenario ${String.fromCharCode(65 + scenarios.length)}`;
    setScenarios((prev) => [...prev, createScenario(name)]);
  };

  return (
    <Flex direction="column" gap="5">
      <Heading size="7">Simulator</Heading>

      <CurrentStateSummary store={store} />

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

      <Flex gap="3" align="end">
        <div style={{ flex: 1 }}>
          <Text size="1" color="gray" mb="1" asChild>
            <span>Left</span>
          </Text>
          <Select.Root
            value={String(compareA)}
            onValueChange={(v) => setCompareA(Number(v))}
          >
            <Select.Trigger style={{ width: '100%' }} />
            <Select.Content>
              {scenarios.map((s, i) => (
                <Select.Item key={s.id} value={String(i)}>
                  {s.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
        <div style={{ flex: 1 }}>
          <Text size="1" color="gray" mb="1" asChild>
            <span>Right</span>
          </Text>
          <Select.Root
            value={String(compareB)}
            onValueChange={(v) => setCompareB(Number(v))}
          >
            <Select.Trigger style={{ width: '100%' }} />
            <Select.Content>
              {scenarios.map((s, i) => (
                <Select.Item key={s.id} value={String(i)}>
                  {s.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
        <Button variant="soft" onClick={addScenario}>
          <Plus size={14} /> New
        </Button>
      </Flex>

      <Flex gap="5" wrap="wrap">
        <ScenarioPanel
          scenario={scenarioA}
          onAddEvent={() => openAddEvent(compareA)}
          onRemoveEvent={(id) => removeEvent(compareA, id)}
        />
        <ScenarioPanel
          scenario={scenarioB}
          onAddEvent={() => openAddEvent(compareB)}
          onRemoveEvent={(id) => removeEvent(compareB, id)}
        />
      </Flex>

      <Separator size="4" />

      <ComparisonChart
        title="Net Worth Over Time"
        dataKey="netWorth"
        resultA={resultA}
        resultB={resultB}
        labelA={scenarioA.name}
        labelB={scenarioB.name}
      />

      <ComparisonChart
        title="Monthly Cash Flow"
        dataKey="cashFlow"
        resultA={resultA}
        resultB={resultB}
        labelA={scenarioA.name}
        labelB={scenarioB.name}
      />

      {stepA && stepB && (
        <SnapshotSection
          month={clampedSnapshot}
          onMonthChange={setSnapshotMonth}
          maxMonth={maxMonth}
          stepA={stepA}
          stepB={stepB}
          labelA={scenarioA.name}
          labelB={scenarioB.name}
        />
      )}

      <MilestonesTable
        resultA={resultA}
        resultB={resultB}
        labelA={scenarioA.name}
        labelB={scenarioB.name}
        horizon={horizon}
      />

      <AddEventDialog
        key={dialogKey}
        open={addEventOpen}
        onOpenChange={setAddEventOpen}
        store={store}
        onAdd={handleAddEvent}
      />
    </Flex>
  );
}
