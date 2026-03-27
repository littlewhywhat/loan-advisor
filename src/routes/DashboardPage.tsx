import { Badge, Card, Flex, Heading, Separator, Text } from '@radix-ui/themes';
import { Info } from 'lucide-react';
import { useMemo } from 'react';
import { useFinance } from '@/context/FinanceProvider';
import { formatMoney, toMonthly } from '@/lib/format';
import { liveBalance } from '@/lib/loanCalc';
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

function isFutureLoan(l: Loan): boolean {
  return new Date(l.startDate) > new Date();
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

    const allLoans = store.liabilities.filter(isLoan);
    const activeLoans = allLoans.filter((l) => !isFutureLoan(l));
    const futureLoans = allLoans.filter(isFutureLoan);

    const activeLoanIds = new Set(activeLoans.map((l) => l.id));
    const futureLoanIds = new Set(futureLoans.map((l) => l.id));
    const futureLoanAssetIds = new Set(futureLoans.map((l) => l.linkedAssetId));

    const manualExpenses = store.expenses.filter(
      (e) => e.category === 'living_expense',
    );
    const debtExpenses = store.expenses.filter(
      (e) =>
        e.category === 'liability' &&
        (!e.linkedLiabilityId || activeLoanIds.has(e.linkedLiabilityId)),
    );
    const futureDebtExpenses = store.expenses.filter(
      (e) =>
        e.category === 'liability' &&
        e.linkedLiabilityId &&
        futureLoanIds.has(e.linkedLiabilityId),
    );
    const ownershipExpenses = store.expenses.filter(
      (e) => e.category === 'ownership',
    );

    const totalManualExpenses = manualExpenses.reduce(
      (sum, e) => sum + toMonthly(e.amount, e.frequency),
      0,
    );
    const totalDebtService = debtExpenses.reduce(
      (sum, e) => sum + toMonthly(e.amount, e.frequency),
      0,
    );
    const totalOwnership = ownershipExpenses.reduce(
      (sum, e) => sum + toMonthly(e.amount, e.frequency),
      0,
    );
    const totalExpenses =
      totalManualExpenses + totalDebtService + totalOwnership;

    const cashFlow = totalIncome - totalExpenses;

    const activeAssets = store.assets.filter(
      (a) => !futureLoanAssetIds.has(a.id),
    );
    const totalAssets = activeAssets.reduce((sum, a) => sum + a.value, 0);
    const totalLiabilities = activeLoans.reduce(
      (sum, l) => sum + liveBalance(l),
      0,
    );
    const netWorth = totalAssets - totalLiabilities;
    const debtToAsset = totalAssets > 0 ? totalLiabilities / totalAssets : 0;

    const passiveCoverage =
      totalManualExpenses > 0 ? totalPassiveIncome / totalManualExpenses : 0;

    const upcomingNotes = futureLoans.map((l) => {
      const expense = futureDebtExpenses.find(
        (e) => e.linkedLiabilityId === l.id,
      );
      const amount = expense
        ? toMonthly(expense.amount, expense.frequency)
        : l.monthlyPayment;
      const asset = store.assets.find((a) => a.id === l.linkedAssetId);
      return {
        name: l.name,
        date: l.startDate,
        monthlyAmount: amount,
        assetName: asset?.name ?? null,
        assetValue: asset?.value ?? null,
        loanAmount: l.originalAmount,
      };
    });

    return {
      manualIncomes,
      passiveIncomes,
      totalManualIncome,
      totalPassiveIncome,
      totalIncome,
      manualExpenses,
      debtExpenses,
      ownershipExpenses,
      totalManualExpenses,
      totalDebtService,
      totalOwnership,
      totalExpenses,
      cashFlow,
      activeAssets,
      totalAssets,
      totalLiabilities,
      netWorth,
      debtToAsset,
      passiveCoverage,
      activeLoans,
      upcomingNotes,
    };
  }, [store]);

  const fmt = (v: number) => formatMoney(v, currency);

  const linkedLiabilityFor = (assetId: string) =>
    store.liabilities.find(
      (l) => isLoan(l) && l.linkedAssetId === assetId && !isFutureLoan(l),
    ) as Loan | undefined;

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

      {metrics.upcomingNotes.length > 0 && (
        <Card>
          <Flex direction="column" gap="2">
            <Flex align="center" gap="2">
              <Info size={14} />
              <Text size="2" weight="bold">
                Upcoming
              </Text>
            </Flex>
            {metrics.upcomingNotes.map((note) => (
              <Flex key={note.name} direction="column" gap="1">
                <Text size="2" color="gray">
                  From {note.date}: expenses increase by{' '}
                  {fmt(note.monthlyAmount)}
                  /mo due to <strong>{note.name}</strong>
                </Text>
                {note.assetName && note.assetValue != null && (
                  <Flex pl="4">
                    <Text size="1" color="gray">
                      Balance sheet: +{fmt(note.assetValue)} asset (
                      {note.assetName}), +{fmt(note.loanAmount)} liability
                    </Text>
                  </Flex>
                )}
              </Flex>
            ))}
          </Flex>
        </Card>
      )}

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

          {metrics.ownershipExpenses.length > 0 && (
            <>
              <Text size="2" weight="bold" color="gray">
                Ownership Costs
              </Text>
              {metrics.ownershipExpenses.map((e) => (
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
          {metrics.activeAssets.length === 0 && (
            <Text size="2" color="gray">
              No assets yet
            </Text>
          )}
          {metrics.activeAssets.map((a) => {
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
                  {a.usage && (
                    <Badge size="1" variant="soft" color="blue">
                      {a.usage}
                    </Badge>
                  )}
                </Flex>
                <Flex align="center" gap="2">
                  <Text size="2" weight="bold">
                    {fmt(a.value)}
                  </Text>
                  {linked && (
                    <Text size="1" color="gray">
                      (equity {fmt(a.value - liveBalance(linked))})
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
          {metrics.activeLoans.length === 0 && (
            <Text size="2" color="gray">
              No active liabilities
            </Text>
          )}
          {metrics.activeLoans.map((l) => (
            <Row key={l.id} label={l.name} value={fmt(liveBalance(l))} indent />
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
