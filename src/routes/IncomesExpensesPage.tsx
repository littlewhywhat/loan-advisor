import {
  AlertDialog,
  Badge,
  Button,
  Card,
  Dialog,
  Flex,
  Heading,
  Select,
  Separator,
  Text,
  TextField,
} from '@radix-ui/themes';
import { Archive, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useEvents } from '@/context/EventProvider';
import {
  findOwnerEvent,
  isEventEditable,
  isStandaloneExpense,
  isStandaloneIncome,
  todayStr,
} from '@/lib/eventUtils';
import { fmtMoney, toMonthly } from '@/lib/format';
import type {
  AddExpenseEvent,
  AddIncomeEvent,
  Currency,
  Expense,
  Frequency,
  Income,
} from '@/types/events';

const FREQUENCIES: Frequency[] = ['monthly', 'quarterly', 'annually'];
const FREQ_LABELS: Record<Frequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

type IncomeForm = {
  name: string;
  amount: number;
  currency: Currency;
  frequency: Frequency;
};
type ExpenseForm = {
  name: string;
  amount: number;
  currency: Currency;
  frequency: Frequency;
};

function emptyIncomeForm(): IncomeForm {
  return { name: '', amount: 0, currency: 'CZK', frequency: 'monthly' };
}

function incomeToForm(i: Income): IncomeForm {
  return {
    name: i.name,
    amount: i.amount.amount,
    currency: i.amount.currency,
    frequency: i.frequency,
  };
}

function emptyExpenseForm(): ExpenseForm {
  return { name: '', amount: 0, currency: 'CZK', frequency: 'monthly' };
}

function expenseToForm(e: Expense): ExpenseForm {
  return {
    name: e.name,
    amount: e.amount.amount,
    currency: e.amount.currency,
    frequency: e.frequency,
  };
}

function IncomeSection() {
  const {
    events,
    derived,
    archivedDerived,
    addEvent,
    updateEvent,
    archiveEvent,
    restoreEvent,
    deleteEvent,
  } = useEvents();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<IncomeForm>(emptyIncomeForm);
  const [archiveTarget, setArchiveTarget] = useState<Income | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Income | null>(null);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyIncomeForm());
    setDialogOpen(true);
  };

  const openEdit = (income: Income) => {
    setEditingId(income.id);
    setForm(incomeToForm(income));
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const incomeData: Income = {
      id: editingId ?? crypto.randomUUID(),
      name: form.name,
      amount: { amount: form.amount, currency: form.currency },
      frequency: form.frequency,
    };

    if (editingId) {
      const owner = findOwnerEvent(events, editingId);
      if (owner?.type === 'add_income') {
        updateEvent(
          owner.id,
          (e) =>
            ({
              ...e,
              income: incomeData,
            }) as AddIncomeEvent,
        );
      }
    } else {
      addEvent({
        type: 'add_income',
        date: todayStr(),
        income: incomeData,
      });
    }
    setDialogOpen(false);
  };

  const handleArchive = () => {
    if (!archiveTarget) return;
    const owner = findOwnerEvent(events, archiveTarget.id);
    if (owner) archiveEvent(owner.id);
    setArchiveTarget(null);
  };

  const handleRestore = (income: Income) => {
    const owner = findOwnerEvent(events, income.id);
    if (owner) restoreEvent(owner.id);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const owner = findOwnerEvent(events, deleteTarget.id);
    if (owner) deleteEvent(owner.id);
    setDeleteTarget(null);
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

      {derived.incomes.length === 0 && (
        <Card>
          <Text size="2" color="gray" align="center">
            No income sources yet.
          </Text>
        </Card>
      )}

      {derived.incomes.map((income) => {
        const standalone = isStandaloneIncome(events, income.id);
        const owner = findOwnerEvent(events, income.id);
        const editable = standalone && owner && isEventEditable(owner);
        return (
          <Card key={income.id}>
            <Flex justify="between" align="center">
              <Flex direction="column" gap="1">
                <Flex align="center" gap="2">
                  <Text size="3" weight="bold">
                    {income.name}
                  </Text>
                  {!standalone && owner && (
                    <Badge size="1" variant="soft" color="blue">
                      from {owner.type.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </Flex>
                <Flex gap="3" align="center">
                  <Text size="2" weight="bold">
                    {fmtMoney(income.amount)}/
                    {income.frequency === 'monthly'
                      ? 'mo'
                      : income.frequency === 'quarterly'
                        ? 'qtr'
                        : 'yr'}
                  </Text>
                  {income.frequency !== 'monthly' && (
                    <Text size="1" color="gray">
                      (
                      {fmtMoney({
                        amount: toMonthly(
                          income.amount.amount,
                          income.frequency,
                        ),
                        currency: income.amount.currency,
                      })}
                      /mo)
                    </Text>
                  )}
                </Flex>
              </Flex>
              {editable && (
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
                    onClick={() => setArchiveTarget(income)}
                  >
                    <Archive size={14} />
                  </Button>
                </Flex>
              )}
            </Flex>
          </Card>
        );
      })}

      {archivedDerived.incomes.length > 0 && (
        <>
          <Heading size="3" color="gray" mt="2">
            Archived
          </Heading>
          {archivedDerived.incomes.map((income) => (
            <Card key={income.id} style={{ opacity: 0.6 }}>
              <Flex justify="between" align="center">
                <Flex align="center" gap="2">
                  <Text size="3" weight="bold">
                    {income.name}
                  </Text>
                  <Text size="2" color="gray">
                    {fmtMoney(income.amount)}/
                    {income.frequency === 'monthly'
                      ? 'mo'
                      : income.frequency === 'quarterly'
                        ? 'qtr'
                        : 'yr'}
                  </Text>
                </Flex>
                <Flex gap="2">
                  <Button
                    size="1"
                    variant="ghost"
                    onClick={() => handleRestore(income)}
                  >
                    <RotateCcw size={14} />
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
          ))}
        </>
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
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, currency: v as Currency }))
                  }
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    <Select.Item value="CZK">CZK</Select.Item>
                    <Select.Item value="EUR">EUR</Select.Item>
                    <Select.Item value="USD">USD</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
            </Flex>

            <div>
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
                  {FREQUENCIES.map((freq) => (
                    <Select.Item key={freq} value={freq}>
                      {FREQ_LABELS[freq]}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
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
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
      >
        <AlertDialog.Content maxWidth="400px">
          <AlertDialog.Title>Archive Income</AlertDialog.Title>
          <AlertDialog.Description>
            Are you sure you want to archive{' '}
            <strong>{archiveTarget?.name}</strong>?
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button color="red" onClick={handleArchive}>
                Archive
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      <AlertDialog.Root
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialog.Content maxWidth="400px">
          <AlertDialog.Title>Delete Income</AlertDialog.Title>
          <AlertDialog.Description>
            Permanently delete <strong>{deleteTarget?.name}</strong>? This
            cannot be undone.
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
  const {
    events,
    derived,
    archivedDerived,
    addEvent,
    updateEvent,
    archiveEvent,
    restoreEvent,
    deleteEvent,
  } = useEvents();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyExpenseForm);
  const [archiveTarget, setArchiveTarget] = useState<Expense | null>(null);
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
    const expenseData: Expense = {
      id: editingId ?? crypto.randomUUID(),
      name: form.name,
      amount: { amount: form.amount, currency: form.currency },
      frequency: form.frequency,
    };

    if (editingId) {
      const owner = findOwnerEvent(events, editingId);
      if (owner?.type === 'add_expense') {
        updateEvent(
          owner.id,
          (e) =>
            ({
              ...e,
              expense: expenseData,
            }) as AddExpenseEvent,
        );
      }
    } else {
      addEvent({
        type: 'add_expense',
        date: todayStr(),
        expense: expenseData,
      });
    }
    setDialogOpen(false);
  };

  const handleArchive = () => {
    if (!archiveTarget) return;
    const owner = findOwnerEvent(events, archiveTarget.id);
    if (owner) archiveEvent(owner.id);
    setArchiveTarget(null);
  };

  const handleRestore = (expense: Expense) => {
    const owner = findOwnerEvent(events, expense.id);
    if (owner) restoreEvent(owner.id);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const owner = findOwnerEvent(events, deleteTarget.id);
    if (owner) deleteEvent(owner.id);
    setDeleteTarget(null);
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

      {derived.expenses.length === 0 && (
        <Card>
          <Text size="2" color="gray" align="center">
            No expenses yet.
          </Text>
        </Card>
      )}

      {derived.expenses.map((expense) => {
        const standalone = isStandaloneExpense(events, expense.id);
        const owner = findOwnerEvent(events, expense.id);
        const editable = standalone && owner && isEventEditable(owner);
        return (
          <Card key={expense.id}>
            <Flex justify="between" align="center">
              <Flex direction="column" gap="1">
                <Flex align="center" gap="2">
                  <Text size="3" weight="bold">
                    {expense.name}
                  </Text>
                  {!standalone && owner && (
                    <Badge size="1" variant="soft" color="blue">
                      from {owner.type.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </Flex>
                <Flex gap="3" align="center">
                  <Text size="2" weight="bold">
                    {fmtMoney(expense.amount)}/
                    {expense.frequency === 'monthly'
                      ? 'mo'
                      : expense.frequency === 'quarterly'
                        ? 'qtr'
                        : 'yr'}
                  </Text>
                  {expense.frequency !== 'monthly' && (
                    <Text size="1" color="gray">
                      (
                      {fmtMoney({
                        amount: toMonthly(
                          expense.amount.amount,
                          expense.frequency,
                        ),
                        currency: expense.amount.currency,
                      })}
                      /mo)
                    </Text>
                  )}
                </Flex>
              </Flex>
              {editable && (
                <Flex gap="2">
                  <Button
                    size="1"
                    variant="ghost"
                    onClick={() => openEdit(expense)}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    size="1"
                    variant="ghost"
                    color="red"
                    onClick={() => setArchiveTarget(expense)}
                  >
                    <Archive size={14} />
                  </Button>
                </Flex>
              )}
            </Flex>
          </Card>
        );
      })}

      {archivedDerived.expenses.length > 0 && (
        <>
          <Heading size="3" color="gray" mt="2">
            Archived
          </Heading>
          {archivedDerived.expenses.map((expense) => (
            <Card key={expense.id} style={{ opacity: 0.6 }}>
              <Flex justify="between" align="center">
                <Flex align="center" gap="2">
                  <Text size="3" weight="bold">
                    {expense.name}
                  </Text>
                  <Text size="2" color="gray">
                    {fmtMoney(expense.amount)}/
                    {expense.frequency === 'monthly'
                      ? 'mo'
                      : expense.frequency === 'quarterly'
                        ? 'qtr'
                        : 'yr'}
                  </Text>
                </Flex>
                <Flex gap="2">
                  <Button
                    size="1"
                    variant="ghost"
                    onClick={() => handleRestore(expense)}
                  >
                    <RotateCcw size={14} />
                  </Button>
                  <Button
                    size="1"
                    variant="ghost"
                    color="red"
                    onClick={() => setDeleteTarget(expense)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </Flex>
              </Flex>
            </Card>
          ))}
        </>
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
                placeholder="e.g. Groceries"
              />
            </div>

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
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, currency: v as Currency }))
                  }
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    <Select.Item value="CZK">CZK</Select.Item>
                    <Select.Item value="EUR">EUR</Select.Item>
                    <Select.Item value="USD">USD</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
            </Flex>

            <div>
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
                  {FREQUENCIES.map((freq) => (
                    <Select.Item key={freq} value={freq}>
                      {FREQ_LABELS[freq]}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
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
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
      >
        <AlertDialog.Content maxWidth="400px">
          <AlertDialog.Title>Archive Expense</AlertDialog.Title>
          <AlertDialog.Description>
            Are you sure you want to archive{' '}
            <strong>{archiveTarget?.name}</strong>?
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button color="red" onClick={handleArchive}>
                Archive
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      <AlertDialog.Root
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialog.Content maxWidth="400px">
          <AlertDialog.Title>Delete Expense</AlertDialog.Title>
          <AlertDialog.Description>
            Permanently delete <strong>{deleteTarget?.name}</strong>? This
            cannot be undone.
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
      <Separator size="4" />
      <ExpenseSection />
    </Flex>
  );
}
