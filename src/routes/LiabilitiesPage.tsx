import {
  AlertDialog,
  Badge,
  Button,
  Card,
  Dialog,
  Flex,
  Heading,
  Select,
  Table,
  Text,
  TextField,
} from '@radix-ui/themes';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useFinance } from '@/context/FinanceProvider';
import { buildAmortizationSchedule } from '@/lib/amortization';
import { formatMoney } from '@/lib/format';
import type {
  Liability,
  LiabilityInput,
  Loan,
  LoanType,
} from '@/types/finance';

const LOAN_TYPES: LoanType[] = [
  'living_mortgage',
  'american_mortgage',
  'business',
  'personal',
];

const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  living_mortgage: 'Living Mortgage',
  american_mortgage: 'American Mortgage',
  business: 'Business Loan',
  personal: 'Personal Loan',
};

function isLoan(l: Liability): l is Loan {
  return l.type === 'loan';
}

function emptyForm(): LoanFormData {
  return {
    name: '',
    loanType: 'living_mortgage',
    originalAmount: 0,
    currentBalance: 0,
    interestRate: 0.05,
    monthlyPayment: 0,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    linkedAssetId: '',
  };
}

type LoanFormData = {
  name: string;
  loanType: LoanType;
  originalAmount: number;
  currentBalance: number;
  interestRate: number;
  monthlyPayment: number;
  startDate: string;
  endDate: string;
  linkedAssetId: string;
};

function loanToForm(l: Loan): LoanFormData {
  return {
    name: l.name,
    loanType: l.loanType,
    originalAmount: l.originalAmount,
    currentBalance: l.currentBalance,
    interestRate: l.interestRate,
    monthlyPayment: l.monthlyPayment,
    startDate: l.startDate.slice(0, 10),
    endDate: l.endDate?.slice(0, 10) ?? '',
    linkedAssetId: l.linkedAssetId ?? '',
  };
}

function formToInput(f: LoanFormData): LiabilityInput {
  return {
    type: 'loan',
    name: f.name,
    loanType: f.loanType,
    originalAmount: f.originalAmount,
    currentBalance: f.currentBalance,
    interestRate: f.interestRate,
    monthlyPayment: f.monthlyPayment,
    startDate: f.startDate,
    endDate: f.endDate || null,
    linkedAssetId: f.linkedAssetId || null,
  };
}

function computeMonthlyPayment(
  principal: number,
  annualRate: number,
  months: number,
): number {
  if (months <= 0 || principal <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  return (principal * r * (1 + r) ** months) / ((1 + r) ** months - 1);
}

function AmortizationTable({ loan }: { loan: Loan }) {
  const schedule = useMemo(
    () =>
      buildAmortizationSchedule(
        loan.currentBalance,
        loan.interestRate,
        loan.monthlyPayment,
      ),
    [loan.currentBalance, loan.interestRate, loan.monthlyPayment],
  );

  if (schedule.length === 0) return null;

  return (
    <Table.Root
      size="1"
      variant="surface"
      style={{ maxHeight: 300, overflowY: 'auto' }}
    >
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Month</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Payment</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Principal</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Interest</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Remaining</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {schedule.map((row) => (
          <Table.Row key={row.month}>
            <Table.Cell>{row.month}</Table.Cell>
            <Table.Cell>{formatMoney(row.payment)}</Table.Cell>
            <Table.Cell>{formatMoney(row.principal)}</Table.Cell>
            <Table.Cell>{formatMoney(row.interest)}</Table.Cell>
            <Table.Cell>{formatMoney(row.remaining)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}

export default function LiabilitiesPage() {
  const { store, addLiability, updateLiability, removeLiability } =
    useFinance();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LoanFormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Loan | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loans = store.liabilities.filter(isLoan);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (loan: Loan) => {
    setEditingId(loan.id);
    setForm(loanToForm(loan));
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      updateLiability(editingId, formToInput(form));
    } else {
      addLiability(formToInput(form));
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    removeLiability(deleteTarget.id);
    setDeleteTarget(null);
  };

  const autoCompute = (f: LoanFormData) => {
    if (
      f.startDate &&
      f.endDate &&
      f.currentBalance > 0 &&
      f.interestRate > 0
    ) {
      const start = new Date(f.startDate);
      const end = new Date(f.endDate);
      const months =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth());
      if (months > 0) {
        const remaining = Math.max(
          0,
          months -
            Math.round(
              (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
            ),
        );
        if (remaining > 0) {
          return {
            ...f,
            monthlyPayment: Math.round(
              computeMonthlyPayment(
                f.currentBalance,
                f.interestRate,
                remaining,
              ),
            ),
          };
        }
      }
    }
    return f;
  };

  const linkedAssetName = (assetId: string | null) => {
    if (!assetId) return null;
    return store.assets.find((a) => a.id === assetId)?.name ?? null;
  };

  return (
    <Flex direction="column" gap="5" style={{ maxWidth: 720 }}>
      <Flex justify="between" align="center">
        <Heading size="7">Liabilities</Heading>
        <Button onClick={openAdd}>
          <Plus size={16} />
          Add Loan
        </Button>
      </Flex>

      {loans.length === 0 && (
        <Card>
          <Text size="3" color="gray" align="center">
            No liabilities yet. Add your first loan to get started.
          </Text>
        </Card>
      )}

      {loans.map((loan) => {
        const assetName = linkedAssetName(loan.linkedAssetId);
        const expanded = expandedId === loan.id;
        return (
          <Card key={loan.id}>
            <Flex direction="column" gap="2">
              <Flex justify="between" align="center">
                <Flex align="center" gap="2">
                  <Text size="3" weight="bold">
                    {loan.name}
                  </Text>
                  <Badge size="1" variant="soft">
                    {LOAN_TYPE_LABELS[loan.loanType]}
                  </Badge>
                </Flex>
                <Flex gap="2">
                  <Button
                    size="1"
                    variant="ghost"
                    onClick={() => setExpandedId(expanded ? null : loan.id)}
                  >
                    {expanded ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </Button>
                  <Button
                    size="1"
                    variant="ghost"
                    onClick={() => openEdit(loan)}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    size="1"
                    variant="ghost"
                    color="red"
                    onClick={() => setDeleteTarget(loan)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </Flex>
              </Flex>

              <Flex gap="5" wrap="wrap">
                <Flex direction="column">
                  <Text size="1" color="gray">
                    Remaining
                  </Text>
                  <Text size="2" weight="bold">
                    {formatMoney(loan.currentBalance)}
                  </Text>
                </Flex>
                <Flex direction="column">
                  <Text size="1" color="gray">
                    Monthly Payment
                  </Text>
                  <Text size="2" weight="bold">
                    {formatMoney(loan.monthlyPayment)}
                  </Text>
                </Flex>
                <Flex direction="column">
                  <Text size="1" color="gray">
                    Rate
                  </Text>
                  <Text size="2" weight="bold">
                    {(loan.interestRate * 100).toFixed(1)}%
                  </Text>
                </Flex>
                {assetName && (
                  <Flex direction="column">
                    <Text size="1" color="gray">
                      Linked Asset
                    </Text>
                    <Text size="2">{assetName}</Text>
                  </Flex>
                )}
              </Flex>

              {expanded && <AmortizationTable loan={loan} />}
            </Flex>
          </Card>
        );
      })}

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Content maxWidth="500px">
          <Dialog.Title>{editingId ? 'Edit Loan' : 'Add Loan'}</Dialog.Title>

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
                placeholder="e.g. Home Mortgage"
              />
            </div>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Loan Type</span>
                </Text>
                <Select.Root
                  value={form.loanType}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, loanType: v as LoanType }))
                  }
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    {LOAN_TYPES.map((t) => (
                      <Select.Item key={t} value={t}>
                        {LOAN_TYPE_LABELS[t]}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>

              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Linked Asset</span>
                </Text>
                <Select.Root
                  value={form.linkedAssetId || '_none'}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      linkedAssetId: v === '_none' ? '' : v,
                    }))
                  }
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    <Select.Item value="_none">None</Select.Item>
                    {store.assets.map((a) => (
                      <Select.Item key={a.id} value={a.id}>
                        {a.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
            </Flex>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Original Amount</span>
                </Text>
                <TextField.Root
                  type="number"
                  value={form.originalAmount || ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      originalAmount: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Current Balance</span>
                </Text>
                <TextField.Root
                  type="number"
                  value={form.currentBalance || ''}
                  onChange={(e) => {
                    const next = {
                      ...form,
                      currentBalance: Number(e.target.value) || 0,
                    };
                    setForm(autoCompute(next));
                  }}
                />
              </div>
            </Flex>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Annual Rate (%)</span>
                </Text>
                <TextField.Root
                  type="number"
                  step="0.1"
                  value={
                    form.interestRate
                      ? (form.interestRate * 100).toFixed(1)
                      : ''
                  }
                  onChange={(e) => {
                    const next = {
                      ...form,
                      interestRate: (Number(e.target.value) || 0) / 100,
                    };
                    setForm(autoCompute(next));
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Monthly Payment</span>
                </Text>
                <TextField.Root
                  type="number"
                  value={form.monthlyPayment || ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      monthlyPayment: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </Flex>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Start Date</span>
                </Text>
                <TextField.Root
                  type="date"
                  value={form.startDate}
                  onChange={(e) => {
                    const next = { ...form, startDate: e.target.value };
                    setForm(autoCompute(next));
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>End Date</span>
                </Text>
                <TextField.Root
                  type="date"
                  value={form.endDate}
                  onChange={(e) => {
                    const next = { ...form, endDate: e.target.value };
                    setForm(autoCompute(next));
                  }}
                />
              </div>
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
          <AlertDialog.Title>Delete Loan</AlertDialog.Title>
          <AlertDialog.Description>
            {deleteTarget && linkedAssetName(deleteTarget.linkedAssetId) ? (
              <>
                <strong>{deleteTarget.name}</strong> is linked to asset{' '}
                <strong>{linkedAssetName(deleteTarget.linkedAssetId)}</strong>.
                The asset will not be removed. Continue?
              </>
            ) : (
              <>
                Are you sure you want to delete{' '}
                <strong>{deleteTarget?.name}</strong>?
              </>
            )}
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
    </Flex>
  );
}
