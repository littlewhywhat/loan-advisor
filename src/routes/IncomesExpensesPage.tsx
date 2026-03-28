import {
  AlertDialog,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  Flex,
  Heading,
  Select,
  Text,
  TextField,
} from '@radix-ui/themes';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useFinance } from '@/context/FinanceProvider';
import { formatMoney, toMonthly } from '@/lib/format';
import type {
  Currency,
  Expense,
  ExpenseCategory,
  ExpenseInput,
  Frequency,
  Income,
  IncomeInput,
  IncomeType,
} from '@/types/finance';

const INCOME_TYPES: IncomeType[] = ['salary', 'rental', 'dividends'];
const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  salary: 'Salary',
  rental: 'Rental',
  dividends: 'Dividends',
};
const INCOME_TYPE_COLORS: Record<IncomeType, 'blue' | 'green' | 'purple'> = {
  salary: 'blue',
  rental: 'green',
  dividends: 'purple',
};

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'living_expense',
  'liability',
  'ownership',
];
const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  living_expense: 'Living Expense',
  liability: 'Debt Service',
  ownership: 'Ownership Cost',
};
const EXPENSE_CATEGORY_COLORS: Record<
  ExpenseCategory,
  'gray' | 'red' | 'orange'
> = {
  living_expense: 'gray',
  liability: 'red',
  ownership: 'orange',
};

const FREQUENCIES: Frequency[] = ['monthly', 'quarterly', 'annually'];
const FREQ_LABELS: Record<Frequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

function emptyIncomeForm(): IncomeInput {
  return {
    name: '',
    type: 'salary',
    amount: 0,
    frequency: 'monthly',
    isPassive: false,
    currency: 'CZK',
    linkedAssetId: null,
  };
}

function incomeToForm(i: Income): IncomeInput {
  return {
    name: i.name,
    type: i.type,
    amount: i.amount,
    frequency: i.frequency,
    isPassive: i.isPassive,
    currency: i.currency,
    linkedAssetId: i.linkedAssetId,
  };
}

function emptyExpenseForm(): ExpenseInput {
  return {
    name: '',
    category: 'living_expense',
    amount: 0,
    frequency: 'monthly',
    isEssential: false,
    currency: 'CZK',
    linkedLiabilityId: null,
  };
}

function expenseToForm(e: Expense): ExpenseInput {
  return {
    name: e.name,
    category: e.category,
    amount: e.amount,
    frequency: e.frequency,
    isEssential: e.isEssential,
    currency: e.currency,
    linkedLiabilityId: e.linkedLiabilityId,
  };
}

function frequencyMultiplier(freq: Frequency): number {
  if (freq === 'monthly') return 12;
  if (freq === 'quarterly') return 4;
  return 1;
}

function IncomeSection() {
  const { store, addIncome, updateIncome, removeIncome } = useFinance();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<IncomeInput>(emptyIncomeForm);
  const [yieldPct, setYieldPct] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<Income | null>(null);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyIncomeForm());
    setYieldPct('');
    setDialogOpen(true);
  };

  const openEdit = (income: Income) => {
    setEditingId(income.id);
    const f = incomeToForm(income);
    setForm(f);
    if (f.linkedAssetId) {
      const asset = store.assets.find((a) => a.id === f.linkedAssetId);
      if (asset && asset.value > 0) {
        const annualIncome = f.amount * frequencyMultiplier(f.frequency);
        setYieldPct(((annualIncome / asset.value) * 100).toFixed(2));
      } else {
        setYieldPct('');
      }
    } else {
      setYieldPct('');
    }
    setDialogOpen(true);
  };

  const handleAssetChange = (assetId: string, currentForm: IncomeInput) => {
    const next = {
      ...currentForm,
      linkedAssetId: assetId === '_none' ? null : assetId,
    };
    setForm(next);
    if (next.linkedAssetId) {
      const asset = store.assets.find((a) => a.id === next.linkedAssetId);
      if (asset && asset.value > 0 && next.amount > 0) {
        const annualIncome = next.amount * frequencyMultiplier(next.frequency);
        setYieldPct(((annualIncome / asset.value) * 100).toFixed(2));
      }
    } else {
      setYieldPct('');
    }
  };

  const handleYieldChange = (pctStr: string) => {
    setYieldPct(pctStr);
    const pct = Number.parseFloat(pctStr);
    if (Number.isNaN(pct) || !form.linkedAssetId) return;
    const asset = store.assets.find((a) => a.id === form.linkedAssetId);
    if (!asset || asset.value <= 0) return;
    const annualIncome = asset.value * (pct / 100);
    const amount = Math.round(
      annualIncome / frequencyMultiplier(form.frequency),
    );
    setForm((f) => ({ ...f, amount }));
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      updateIncome(editingId, form);
    } else {
      addIncome(form);
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    removeIncome(deleteTarget.id);
    setDeleteTarget(null);
  };

  const assetName = (id: string | null) =>
    id ? (store.assets.find((a) => a.id === id)?.name ?? null) : null;

  const { activeIncomes, upcomingIncomes } = useMemo(() => {
    const futureAssetDates = new Map<string, string>();
    for (const l of store.liabilities) {
      if (l.type === 'loan' && new Date(l.startDate) > new Date()) {
        futureAssetDates.set(l.linkedAssetId, l.startDate);
      }
    }
    const active: Income[] = [];
    const upcoming: { income: Income; startDate: string }[] = [];
    for (const i of store.incomes) {
      const startDate = i.linkedAssetId
        ? futureAssetDates.get(i.linkedAssetId)
        : undefined;
      if (startDate) {
        upcoming.push({ income: i, startDate });
      } else {
        active.push(i);
      }
    }
    return { activeIncomes: active, upcomingIncomes: upcoming };
  }, [store.incomes, store.liabilities, store.assets]);

  const renderIncomeCard = (income: Income, futureStartDate: string | null) => {
    const linked = assetName(income.linkedAssetId);
    const isFuture = futureStartDate !== null;
    return (
      <Card key={income.id} style={isFuture ? { opacity: 0.75 } : undefined}>
        <Flex justify="between" align="center">
          <Flex direction="column" gap="1">
            <Flex align="center" gap="2">
              <Text size="3" weight="bold">
                {income.name}
              </Text>
              <Badge color={INCOME_TYPE_COLORS[income.type]} size="1">
                {INCOME_TYPE_LABELS[income.type]}
              </Badge>
              {income.isPassive && (
                <Badge size="1" variant="soft" color="green">
                  Passive
                </Badge>
              )}
              {isFuture && (
                <Badge size="1" variant="soft" color="blue">
                  Starts {futureStartDate}
                </Badge>
              )}
            </Flex>
            <Flex gap="3" align="center">
              <Text size="2" weight="bold">
                {formatMoney(income.amount, income.currency as Currency)}/
                {income.frequency === 'monthly'
                  ? 'mo'
                  : income.frequency === 'quarterly'
                    ? 'qtr'
                    : 'yr'}
              </Text>
              <Text size="1" color="gray">
                (
                {formatMoney(
                  toMonthly(income.amount, income.frequency),
                  income.currency as Currency,
                )}
                /mo)
              </Text>
              {linked && (
                <Badge size="1" variant="outline">
                  {linked}
                </Badge>
              )}
            </Flex>
          </Flex>
          <Flex gap="2">
            <Button
              size="1"
              variant="ghost"
              onClick={() => openEdit(income)}
            >
              <Pencil size={14} />
            </Button>
            <Button
              size="1"
              variant="ghost"
              color="red"
              onClick={() => setDeleteTarget(income)}
            >
              <Trash2 size={14} />
            </Button>
          </Flex>
        </Flex>
      </Card>
    );
  };

  return (
    <>
      <Flex justify="between" align="center">
        <Heading size="5">Income</Heading>
        <Button size="2" onClick={openAdd}>
          <Plus size={16} />
          Add Income
        </Button>
      </Flex>

      {store.incomes.length === 0 && (
        <Card>
          <Text size="2" color="gray" align="center">
            No income sources yet.
          </Text>
        </Card>
      )}

      {activeIncomes.map((income) => renderIncomeCard(income, null))}

      {upcomingIncomes.length > 0 && (
        <Flex direction="column" gap="3">
          <Text size="2" weight="bold" color="gray">
            Upcoming Income
          </Text>
          {upcomingIncomes.map(({ income, startDate }) =>
            renderIncomeCard(income, startDate),
          )}
        </Flex>
      )}

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Content maxWidth="500px">
          <Dialog.Title>
            {editingId ? 'Edit Income' : 'Add Income'}
          </Dialog.Title>

          <Flex direction="column" gap="3" mt="3">
            <div>
              <Text size="2" weight="medium" mb="1" asChild>
                <span>Name</span>
              </Text>
              <TextField.Root
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Salary"
              />
            </div>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Type</span>
                </Text>
                <Select.Root
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      type: v as IncomeType,
                      isPassive: v !== 'salary',
                    }))
                  }
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    {INCOME_TYPES.map((t) => (
                      <Select.Item key={t} value={t}>
                        {INCOME_TYPE_LABELS[t]}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>

              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Frequency</span>
                </Text>
                <Select.Root
                  value={form.frequency}
                  onValueChange={(v) => {
                    const newFreq = v as Frequency;
                    setForm((f) => ({ ...f, frequency: newFreq }));
                    if (form.linkedAssetId && yieldPct) {
                      const pct = Number.parseFloat(yieldPct);
                      const asset = store.assets.find(
                        (a) => a.id === form.linkedAssetId,
                      );
                      if (!Number.isNaN(pct) && asset && asset.value > 0) {
                        const annualIncome = asset.value * (pct / 100);
                        const amount = Math.round(
                          annualIncome / frequencyMultiplier(newFreq),
                        );
                        setForm((f) => ({ ...f, amount, frequency: newFreq }));
                      }
                    }
                  }}
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    {FREQUENCIES.map((f) => (
                      <Select.Item key={f} value={f}>
                        {FREQ_LABELS[f]}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
            </Flex>

            <div>
              <Text size="2" weight="medium" mb="1" asChild>
                <span>Linked Asset</span>
              </Text>
              <Select.Root
                value={form.linkedAssetId ?? '_none'}
                onValueChange={(v) => handleAssetChange(v, form)}
              >
                <Select.Trigger style={{ width: '100%' }} />
                <Select.Content>
                  <Select.Item value="_none">None</Select.Item>
                  {store.assets.map((a) => (
                    <Select.Item key={a.id} value={a.id}>
                      {a.name} ({formatMoney(a.value, a.currency)})
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>

            {form.linkedAssetId && (
              <div>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Annual Yield %</span>
                </Text>
                <TextField.Root
                  type="number"
                  step="0.1"
                  value={yieldPct}
                  onChange={(e) => handleYieldChange(e.target.value)}
                  placeholder="e.g. 2.5"
                />
                <Text size="1" color="gray">
                  Sets amount based on asset value x yield
                </Text>
              </div>
            )}

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Amount</span>
                </Text>
                <TextField.Root
                  type="number"
                  value={form.amount || ''}
                  onChange={(e) => {
                    const amount = Number(e.target.value) || 0;
                    setForm((f) => ({ ...f, amount }));
                    if (form.linkedAssetId) {
                      const asset = store.assets.find(
                        (a) => a.id === form.linkedAssetId,
                      );
                      if (asset && asset.value > 0) {
                        const annual =
                          amount * frequencyMultiplier(form.frequency);
                        setYieldPct(((annual / asset.value) * 100).toFixed(2));
                      }
                    }
                  }}
                  placeholder="0"
                />
              </div>
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Currency</span>
                </Text>
                <Select.Root
                  value={form.currency}
                  onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    <Select.Item value="CZK">CZK</Select.Item>
                    <Select.Item value="EUR">EUR</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
            </Flex>

            <Flex asChild gap="2" align="center">
              <Text size="2">
                <Checkbox
                  checked={form.isPassive}
                  onCheckedChange={(c) =>
                    setForm((f) => ({ ...f, isPassive: c === true }))
                  }
                />
                Passive income
              </Text>
            </Flex>
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={handleSave}>{editingId ? 'Save' : 'Add'}</Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <AlertDialog.Root
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialog.Content maxWidth="400px">
          <AlertDialog.Title>Delete Income</AlertDialog.Title>
          <AlertDialog.Description>
            Are you sure you want to delete{' '}
            <strong>{deleteTarget?.name}</strong>?
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button color="red" onClick={handleDelete}>
                Delete
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  );
}

function ExpenseSection() {
  const { store, addExpense, updateExpense, removeExpense } = useFinance();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseInput>(emptyExpenseForm);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyExpenseForm());
    setDialogOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setForm(expenseToForm(expense));
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      updateExpense(editingId, form);
    } else {
      addExpense(form);
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    removeExpense(deleteTarget.id);
    setDeleteTarget(null);
  };

  const liabilityName = (id: string | null) =>
    id ? (store.liabilities.find((l) => l.id === id)?.name ?? null) : null;

  const { activeExpenses, upcomingExpenses } = useMemo(() => {
    const futureLiabilityDates = new Map<string, string>();
    for (const l of store.liabilities) {
      if (l.type === 'loan' && new Date(l.startDate) > new Date()) {
        futureLiabilityDates.set(l.id, l.startDate);
      }
    }
    const active: Expense[] = [];
    const upcoming: { expense: Expense; startDate: string }[] = [];
    for (const e of store.expenses) {
      const startDate = e.linkedLiabilityId
        ? futureLiabilityDates.get(e.linkedLiabilityId)
        : undefined;
      if (startDate) {
        upcoming.push({ expense: e, startDate });
      } else {
        active.push(e);
      }
    }
    return { activeExpenses: active, upcomingExpenses: upcoming };
  }, [store.expenses, store.liabilities]);

  const renderExpenseCard = (
    expense: Expense,
    futureStartDate: string | null,
  ) => {
    const linked = liabilityName(expense.linkedLiabilityId);
    const isFuture = futureStartDate !== null;
    return (
      <Card
        key={expense.id}
        style={isFuture ? { opacity: 0.75 } : undefined}
      >
        <Flex justify="between" align="center">
          <Flex direction="column" gap="1">
            <Flex align="center" gap="2">
              <Text size="3" weight="bold">
                {expense.name}
              </Text>
              <Badge
                color={EXPENSE_CATEGORY_COLORS[expense.category]}
                size="1"
              >
                {EXPENSE_CATEGORY_LABELS[expense.category]}
              </Badge>
              {expense.isEssential && (
                <Badge size="1" variant="soft" color="orange">
                  Essential
                </Badge>
              )}
              {isFuture && (
                <Badge size="1" variant="soft" color="blue">
                  Starts {futureStartDate}
                </Badge>
              )}
            </Flex>
            <Flex gap="3" align="center">
              <Text size="2" weight="bold">
                {formatMoney(expense.amount, expense.currency as Currency)}/
                {expense.frequency === 'monthly'
                  ? 'mo'
                  : expense.frequency === 'quarterly'
                    ? 'qtr'
                    : 'yr'}
              </Text>
              <Text size="1" color="gray">
                (
                {formatMoney(
                  toMonthly(expense.amount, expense.frequency),
                  expense.currency as Currency,
                )}
                /mo)
              </Text>
              {linked && (
                <Badge size="1" variant="outline">
                  {linked}
                </Badge>
              )}
              {expense.linkedLiabilityId && (
                <Badge size="1" variant="soft" color="blue">
                  Auto-managed
                </Badge>
              )}
            </Flex>
          </Flex>
          <Flex gap="2">
            <Button
              size="1"
              variant="ghost"
              onClick={() => openEdit(expense)}
            >
              <Pencil size={14} />
            </Button>
            {!expense.linkedLiabilityId && (
              <Button
                size="1"
                variant="ghost"
                color="red"
                onClick={() => setDeleteTarget(expense)}
              >
                <Trash2 size={14} />
              </Button>
            )}
          </Flex>
        </Flex>
      </Card>
    );
  };

  return (
    <>
      <Flex justify="between" align="center">
        <Heading size="5">Expenses</Heading>
        <Button size="2" onClick={openAdd}>
          <Plus size={16} />
          Add Expense
        </Button>
      </Flex>

      {store.expenses.length === 0 && (
        <Card>
          <Text size="2" color="gray" align="center">
            No expenses yet.
          </Text>
        </Card>
      )}

      {activeExpenses.map((expense) => renderExpenseCard(expense, null))}

      {upcomingExpenses.length > 0 && (
        <Flex direction="column" gap="3">
          <Text size="2" weight="bold" color="gray">
            Upcoming Expenses
          </Text>
          {upcomingExpenses.map(({ expense, startDate }) =>
            renderExpenseCard(expense, startDate),
          )}
        </Flex>
      )}

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Content maxWidth="500px">
          <Dialog.Title>
            {editingId ? 'Edit Expense' : 'Add Expense'}
          </Dialog.Title>

          <Flex direction="column" gap="3" mt="3">
            <div>
              <Text size="2" weight="medium" mb="1" asChild>
                <span>Name</span>
              </Text>
              <TextField.Root
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Rent"
              />
            </div>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Category</span>
                </Text>
                <Select.Root
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      category: v as ExpenseCategory,
                    }))
                  }
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <Select.Item key={c} value={c}>
                        {EXPENSE_CATEGORY_LABELS[c]}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>

              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Frequency</span>
                </Text>
                <Select.Root
                  value={form.frequency}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, frequency: v as Frequency }))
                  }
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    {FREQUENCIES.map((f) => (
                      <Select.Item key={f} value={f}>
                        {FREQ_LABELS[f]}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
            </Flex>

            {form.category === 'liability' && (
              <div>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Linked Liability</span>
                </Text>
                <Select.Root
                  value={form.linkedLiabilityId ?? '_none'}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      linkedLiabilityId: v === '_none' ? null : v,
                    }))
                  }
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    <Select.Item value="_none">None</Select.Item>
                    {store.liabilities.map((l) => (
                      <Select.Item key={l.id} value={l.id}>
                        {l.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
            )}

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Amount</span>
                </Text>
                <TextField.Root
                  type="number"
                  value={form.amount || ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      amount: Number(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                />
              </div>
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Currency</span>
                </Text>
                <Select.Root
                  value={form.currency}
                  onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    <Select.Item value="CZK">CZK</Select.Item>
                    <Select.Item value="EUR">EUR</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
            </Flex>

            <Flex asChild gap="2" align="center">
              <Text size="2">
                <Checkbox
                  checked={form.isEssential}
                  onCheckedChange={(c) =>
                    setForm((f) => ({ ...f, isEssential: c === true }))
                  }
                />
                Essential expense
              </Text>
            </Flex>
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={handleSave}>{editingId ? 'Save' : 'Add'}</Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <AlertDialog.Root
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialog.Content maxWidth="400px">
          <AlertDialog.Title>Delete Expense</AlertDialog.Title>
          <AlertDialog.Description>
            Are you sure you want to delete{' '}
            <strong>{deleteTarget?.name}</strong>?
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button color="red" onClick={handleDelete}>
                Delete
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  );
}

export default function IncomesExpensesPage() {
  return (
    <Flex direction="column" gap="5" style={{ maxWidth: 720 }}>
      <Heading size="7">Income & Expenses</Heading>
      <IncomeSection />
      <ExpenseSection />
    </Flex>
  );
}
