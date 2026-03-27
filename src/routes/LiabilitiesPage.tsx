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
import { formatMoney, toMonthly } from '@/lib/format';
import { computeLoanDerived, liveBalance } from '@/lib/loanCalc';
import type {
  AssetType,
  Currency,
  Frequency,
  Liability,
  LiabilityInput,
  Loan,
  LoanType,
  Recurring,
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

const FREQ_LABELS: Record<Frequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

const ALL_ASSET_TYPES: AssetType[] = [
  'real_estate',
  'cash',
  'etf',
  'crypto',
  'other',
];

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  cash: 'Cash',
  real_estate: 'Real Estate',
  etf: 'ETF',
  crypto: 'Crypto',
  other: 'Other',
};

function isLoan(l: Liability): l is Loan {
  return l.type === 'loan';
}

function isRecurring(l: Liability): l is Recurring {
  return l.type === 'recurring';
}

type LoanFormData = {
  name: string;
  loanType: LoanType;
  originalAmount: number;
  interestRate: number;
  startDate: string;
  endDate: string;
  linkedAssetId: string;
  assetName: string;
  assetType: AssetType;
  assetValue: number;
};

type RecurringFormData = {
  name: string;
  amount: number;
  frequency: Frequency;
  currency: Currency;
  linkedAssetId: string;
};

function emptyLoanForm(): LoanFormData {
  return {
    name: '',
    loanType: 'living_mortgage',
    originalAmount: 0,
    interestRate: 0.05,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    linkedAssetId: '',
    assetName: '',
    assetType: 'real_estate',
    assetValue: 0,
  };
}

function emptyRecurringForm(): RecurringFormData {
  return {
    name: '',
    amount: 0,
    frequency: 'monthly',
    currency: 'CZK',
    linkedAssetId: '',
  };
}

function loanToForm(l: Loan): LoanFormData {
  return {
    name: l.name,
    loanType: l.loanType,
    originalAmount: l.originalAmount,
    interestRate: l.interestRate,
    startDate: l.startDate.slice(0, 10),
    endDate: l.endDate?.slice(0, 10) ?? '',
    linkedAssetId: l.linkedAssetId,
    assetName: '',
    assetType: 'real_estate',
    assetValue: 0,
  };
}

function recurringToForm(r: Recurring): RecurringFormData {
  return {
    name: r.name,
    amount: r.amount,
    frequency: r.frequency,
    currency: r.currency as Currency,
    linkedAssetId: r.linkedAssetId ?? '',
  };
}

function recurringFormToInput(f: RecurringFormData): LiabilityInput {
  return {
    type: 'recurring',
    name: f.name,
    amount: f.amount,
    frequency: f.frequency,
    currency: f.currency,
    linkedAssetId: f.linkedAssetId || null,
  };
}

function AmortizationTable({ loan }: { loan: Loan }) {
  const balance = liveBalance(loan);
  const schedule = useMemo(
    () =>
      buildAmortizationSchedule(
        balance,
        loan.interestRate,
        loan.monthlyPayment,
      ),
    [balance, loan.interestRate, loan.monthlyPayment],
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
  const { store, addLiability, updateLiability, removeLiability, addAsset } =
    useFinance();
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loanForm, setLoanForm] = useState<LoanFormData>(emptyLoanForm);
  const [recurringForm, setRecurringForm] =
    useState<RecurringFormData>(emptyRecurringForm);
  const [deleteTarget, setDeleteTarget] = useState<Liability | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loans = store.liabilities.filter(isLoan);
  const recurrings = store.liabilities.filter(isRecurring);

  const computed = useMemo(() => {
    if (
      !loanForm.originalAmount ||
      !loanForm.interestRate ||
      !loanForm.startDate ||
      !loanForm.endDate
    ) {
      return null;
    }
    return computeLoanDerived(
      loanForm.originalAmount,
      loanForm.interestRate,
      loanForm.startDate,
      loanForm.endDate,
    );
  }, [
    loanForm.originalAmount,
    loanForm.interestRate,
    loanForm.startDate,
    loanForm.endDate,
  ]);

  const openAddLoan = () => {
    setEditingId(null);
    setLoanForm(emptyLoanForm());
    setLoanDialogOpen(true);
  };

  const openAddRecurring = () => {
    setEditingId(null);
    setRecurringForm(emptyRecurringForm());
    setRecurringDialogOpen(true);
  };

  const openEditLoan = (loan: Loan) => {
    setEditingId(loan.id);
    setLoanForm(loanToForm(loan));
    setLoanDialogOpen(true);
  };

  const openEditRecurring = (r: Recurring) => {
    setEditingId(r.id);
    setRecurringForm(recurringToForm(r));
    setRecurringDialogOpen(true);
  };

  const handleSaveLoan = () => {
    if (!loanForm.name.trim() || !computed) return;

    if (editingId) {
      updateLiability(editingId, {
        type: 'loan',
        name: loanForm.name,
        loanType: loanForm.loanType,
        originalAmount: loanForm.originalAmount,
        currentBalance: computed.currentBalance,
        interestRate: loanForm.interestRate,
        monthlyPayment: computed.monthlyPayment,
        startDate: loanForm.startDate,
        endDate: loanForm.endDate || null,
        linkedAssetId: loanForm.linkedAssetId,
      });
    } else {
      let assetId = loanForm.linkedAssetId;

      if (!assetId) {
        if (!loanForm.assetName.trim()) return;
        assetId = addAsset({
          name: loanForm.assetName,
          type: loanForm.assetType,
          value: loanForm.assetValue || loanForm.originalAmount,
          currency: store.currency,
          yearlyGrowthRate: null,
          usage: loanForm.assetType === 'real_estate' ? 'living' : null,
          rentSavings: null,
          linkedIncomeIds: [],
        });
      }

      addLiability({
        type: 'loan',
        name: loanForm.name,
        loanType: loanForm.loanType,
        originalAmount: loanForm.originalAmount,
        currentBalance: computed.currentBalance,
        interestRate: loanForm.interestRate,
        monthlyPayment: computed.monthlyPayment,
        startDate: loanForm.startDate,
        endDate: loanForm.endDate || null,
        linkedAssetId: assetId,
      });
    }
    setLoanDialogOpen(false);
  };

  const handleSaveRecurring = () => {
    if (!recurringForm.name.trim()) return;
    if (editingId) {
      updateLiability(editingId, recurringFormToInput(recurringForm));
    } else {
      addLiability(recurringFormToInput(recurringForm));
    }
    setRecurringDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    removeLiability(deleteTarget.id);
    setDeleteTarget(null);
  };

  const assetNameById = (assetId: string | null) => {
    if (!assetId) return null;
    return store.assets.find((a) => a.id === assetId)?.name ?? null;
  };

  return (
    <Flex direction="column" gap="5" style={{ maxWidth: 720 }}>
      <Flex justify="between" align="center">
        <Heading size="7">Liabilities</Heading>
        <Flex gap="2">
          <Button variant="soft" onClick={openAddRecurring}>
            <Plus size={16} />
            Add Recurring
          </Button>
          <Button onClick={openAddLoan}>
            <Plus size={16} />
            Add Loan
          </Button>
        </Flex>
      </Flex>

      {loans.length === 0 && recurrings.length === 0 && (
        <Card>
          <Text size="3" color="gray" align="center">
            No liabilities yet. Add a loan or recurring cost to get started.
          </Text>
        </Card>
      )}

      {loans.length > 0 && (
        <Flex direction="column" gap="3">
          <Text size="2" weight="bold" color="gray">
            Loans
          </Text>
          {loans.map((loan) => {
            const assetName = assetNameById(loan.linkedAssetId);
            const expanded = expandedId === loan.id;
            const balance = liveBalance(loan);
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
                        onClick={() => openEditLoan(loan)}
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
                        {formatMoney(balance)}
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
                          Asset
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
        </Flex>
      )}

      {recurrings.length > 0 && (
        <Flex direction="column" gap="3">
          <Text size="2" weight="bold" color="gray">
            Recurring Costs
          </Text>
          {recurrings.map((r) => {
            const assetName = assetNameById(r.linkedAssetId);
            return (
              <Card key={r.id}>
                <Flex justify="between" align="center">
                  <Flex direction="column" gap="1">
                    <Flex align="center" gap="2">
                      <Text size="3" weight="bold">
                        {r.name}
                      </Text>
                      <Badge size="1" variant="soft" color="orange">
                        {FREQ_LABELS[r.frequency]}
                      </Badge>
                      {assetName && (
                        <Badge size="1" variant="outline">
                          {assetName}
                        </Badge>
                      )}
                    </Flex>
                    <Text size="2" weight="bold">
                      {formatMoney(r.amount, r.currency as Currency)}/
                      {r.frequency === 'monthly'
                        ? 'mo'
                        : r.frequency === 'quarterly'
                          ? 'qtr'
                          : 'yr'}
                      <Text size="1" color="gray" ml="2">
                        (
                        {formatMoney(
                          toMonthly(r.amount, r.frequency),
                          r.currency as Currency,
                        )}
                        /mo)
                      </Text>
                    </Text>
                  </Flex>
                  <Flex gap="2">
                    <Button
                      size="1"
                      variant="ghost"
                      onClick={() => openEditRecurring(r)}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="1"
                      variant="ghost"
                      color="red"
                      onClick={() => setDeleteTarget(r)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </Flex>
                </Flex>
              </Card>
            );
          })}
        </Flex>
      )}

      <Dialog.Root open={loanDialogOpen} onOpenChange={setLoanDialogOpen}>
        <Dialog.Content maxWidth="500px">
          <Dialog.Title>{editingId ? 'Edit Loan' : 'Add Loan'}</Dialog.Title>

          <Flex direction="column" gap="3" mt="3">
            <Flex gap="3">
              <div style={{ flex: 2 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Name</span>
                </Text>
                <TextField.Root
                  value={loanForm.name}
                  onChange={(e) =>
                    setLoanForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Home Mortgage"
                />
              </div>
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Loan Type</span>
                </Text>
                <Select.Root
                  value={loanForm.loanType}
                  onValueChange={(v) =>
                    setLoanForm((f) => ({ ...f, loanType: v as LoanType }))
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
            </Flex>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Original Amount</span>
                </Text>
                <TextField.Root
                  type="number"
                  value={loanForm.originalAmount || ''}
                  onChange={(e) =>
                    setLoanForm((f) => ({
                      ...f,
                      originalAmount: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Annual Rate (%)</span>
                </Text>
                <TextField.Root
                  type="number"
                  step="0.1"
                  value={
                    loanForm.interestRate
                      ? (loanForm.interestRate * 100).toFixed(1)
                      : ''
                  }
                  onChange={(e) =>
                    setLoanForm((f) => ({
                      ...f,
                      interestRate: (Number(e.target.value) || 0) / 100,
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
                  value={loanForm.startDate}
                  onChange={(e) =>
                    setLoanForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                />
              </div>
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>End Date</span>
                </Text>
                <TextField.Root
                  type="date"
                  value={loanForm.endDate}
                  onChange={(e) =>
                    setLoanForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                />
              </div>
            </Flex>

            {computed && (
              <Card variant="surface">
                <Flex gap="5">
                  <Flex direction="column">
                    <Text size="1" color="gray">
                      Monthly Payment
                    </Text>
                    <Text size="3" weight="bold">
                      {formatMoney(computed.monthlyPayment, store.currency)}
                    </Text>
                  </Flex>
                  <Flex direction="column">
                    <Text size="1" color="gray">
                      Current Balance
                    </Text>
                    <Text size="3" weight="bold">
                      {formatMoney(computed.currentBalance, store.currency)}
                    </Text>
                  </Flex>
                </Flex>
              </Card>
            )}

            {!editingId ? (
              <Card variant="surface">
                <Flex direction="column" gap="2">
                  <Text size="2" weight="bold">
                    Asset
                  </Text>
                  <Select.Root
                    value={loanForm.linkedAssetId || '_new'}
                    onValueChange={(v) =>
                      setLoanForm((f) => ({
                        ...f,
                        linkedAssetId: v === '_new' ? '' : v,
                      }))
                    }
                  >
                    <Select.Trigger style={{ width: '100%' }} />
                    <Select.Content>
                      <Select.Item value="_new">+ Create New Asset</Select.Item>
                      {store.assets.map((a) => (
                        <Select.Item key={a.id} value={a.id}>
                          {a.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                  {!loanForm.linkedAssetId && (
                    <Flex gap="3">
                      <div style={{ flex: 2 }}>
                        <Text size="1" weight="medium" asChild>
                          <span>Name</span>
                        </Text>
                        <TextField.Root
                          value={loanForm.assetName}
                          onChange={(e) =>
                            setLoanForm((f) => ({
                              ...f,
                              assetName: e.target.value,
                            }))
                          }
                          placeholder="e.g. My Apartment"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text size="1" weight="medium" asChild>
                          <span>Type</span>
                        </Text>
                        <Select.Root
                          value={loanForm.assetType}
                          onValueChange={(v) =>
                            setLoanForm((f) => ({
                              ...f,
                              assetType: v as AssetType,
                            }))
                          }
                        >
                          <Select.Trigger style={{ width: '100%' }} />
                          <Select.Content>
                            {ALL_ASSET_TYPES.map((t) => (
                              <Select.Item key={t} value={t}>
                                {ASSET_TYPE_LABELS[t]}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text size="1" weight="medium" asChild>
                          <span>Value</span>
                        </Text>
                        <TextField.Root
                          type="number"
                          value={loanForm.assetValue || ''}
                          onChange={(e) =>
                            setLoanForm((f) => ({
                              ...f,
                              assetValue: Number(e.target.value) || 0,
                            }))
                          }
                          placeholder={
                            loanForm.originalAmount
                              ? String(loanForm.originalAmount)
                              : '0'
                          }
                        />
                      </div>
                    </Flex>
                  )}
                </Flex>
              </Card>
            ) : (
              (() => {
                const name = assetNameById(loanForm.linkedAssetId);
                return name ? (
                  <Flex gap="2" align="center">
                    <Text size="2" color="gray">
                      Linked to:
                    </Text>
                    <Badge size="1">{name}</Badge>
                  </Flex>
                ) : null;
              })()
            )}
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={handleSaveLoan} disabled={!computed}>
              {editingId ? 'Save' : 'Add'}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root
        open={recurringDialogOpen}
        onOpenChange={setRecurringDialogOpen}
      >
        <Dialog.Content maxWidth="450px">
          <Dialog.Title>
            {editingId ? 'Edit Recurring Cost' : 'Add Recurring Cost'}
          </Dialog.Title>

          <Flex direction="column" gap="3" mt="3">
            <div>
              <Text size="2" weight="medium" mb="1" asChild>
                <span>Name</span>
              </Text>
              <TextField.Root
                value={recurringForm.name}
                onChange={(e) =>
                  setRecurringForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Property Tax"
              />
            </div>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Amount</span>
                </Text>
                <TextField.Root
                  type="number"
                  value={recurringForm.amount || ''}
                  onChange={(e) =>
                    setRecurringForm((f) => ({
                      ...f,
                      amount: Number(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                />
              </div>
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Frequency</span>
                </Text>
                <Select.Root
                  value={recurringForm.frequency}
                  onValueChange={(v) =>
                    setRecurringForm((f) => ({
                      ...f,
                      frequency: v as Frequency,
                    }))
                  }
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    {(['monthly', 'quarterly', 'annually'] as Frequency[]).map(
                      (freq) => (
                        <Select.Item key={freq} value={freq}>
                          {FREQ_LABELS[freq]}
                        </Select.Item>
                      ),
                    )}
                  </Select.Content>
                </Select.Root>
              </div>
            </Flex>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Currency</span>
                </Text>
                <Select.Root
                  value={recurringForm.currency}
                  onValueChange={(v) =>
                    setRecurringForm((f) => ({ ...f, currency: v as Currency }))
                  }
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    <Select.Item value="CZK">CZK</Select.Item>
                    <Select.Item value="EUR">EUR</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Linked Asset</span>
                </Text>
                <Select.Root
                  value={recurringForm.linkedAssetId || '_none'}
                  onValueChange={(v) =>
                    setRecurringForm((f) => ({
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
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={handleSaveRecurring}>
              {editingId ? 'Save' : 'Add'}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <AlertDialog.Root
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialog.Content maxWidth="400px">
          <AlertDialog.Title>Delete Liability</AlertDialog.Title>
          <AlertDialog.Description>
            Are you sure you want to delete{' '}
            <strong>{deleteTarget?.name}</strong>? The linked expense will also
            be removed.
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
