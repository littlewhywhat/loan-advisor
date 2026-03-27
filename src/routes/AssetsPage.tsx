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
import { useState } from 'react';
import { useFinance } from '@/context/FinanceProvider';
import { formatMoney, toMonthly } from '@/lib/format';
import type {
  Asset,
  AssetType,
  Currency,
  Frequency,
  RealEstateUsage,
} from '@/types/finance';

const ASSET_TYPES: AssetType[] = ['cash', 'real_estate', 'etf', 'crypto'];

const TYPE_LABELS: Record<AssetType, string> = {
  cash: 'Cash',
  real_estate: 'Real Estate',
  etf: 'ETF',
  crypto: 'Crypto',
};

const TYPE_COLORS: Record<AssetType, 'green' | 'blue' | 'purple' | 'orange'> = {
  cash: 'green',
  real_estate: 'blue',
  etf: 'purple',
  crypto: 'orange',
};

const USAGE_LABELS: Record<RealEstateUsage, string> = {
  living: 'Living',
  leasing: 'Leasing',
};

const FREQ_LABELS: Record<Frequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

type AssetFormData = {
  name: string;
  type: AssetType;
  value: number;
  currency: Currency;
  yearlyGrowthRate: string;
  usage: RealEstateUsage | '';
  rentSavings: string;
  addRecurringCost: boolean;
  recurringCostName: string;
  recurringCostAmount: number;
  recurringCostFrequency: Frequency;
  addRentalIncome: boolean;
  rentalIncomeName: string;
  rentalIncomeAmount: number;
};

function emptyForm(): AssetFormData {
  return {
    name: '',
    type: 'cash',
    value: 0,
    currency: 'CZK',
    yearlyGrowthRate: '',
    usage: '',
    rentSavings: '',
    addRecurringCost: false,
    recurringCostName: '',
    recurringCostAmount: 0,
    recurringCostFrequency: 'annually',
    addRentalIncome: false,
    rentalIncomeName: '',
    rentalIncomeAmount: 0,
  };
}

function assetToForm(a: Asset): AssetFormData {
  return {
    name: a.name,
    type: a.type,
    value: a.value,
    currency: a.currency,
    yearlyGrowthRate:
      a.yearlyGrowthRate != null ? (a.yearlyGrowthRate * 100).toFixed(1) : '',
    usage: a.usage ?? '',
    rentSavings: a.rentSavings != null ? String(a.rentSavings) : '',
    addRecurringCost: false,
    recurringCostName: '',
    recurringCostAmount: 0,
    recurringCostFrequency: 'annually',
    addRentalIncome: false,
    rentalIncomeName: '',
    rentalIncomeAmount: 0,
  };
}

export default function AssetsPage() {
  const { store, addAsset, updateAsset, removeAsset, addLiability, addIncome } =
    useFinance();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssetFormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (asset: Asset) => {
    setEditingId(asset.id);
    setForm(assetToForm(asset));
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;

    const growthRate = form.yearlyGrowthRate
      ? Number.parseFloat(form.yearlyGrowthRate) / 100
      : null;
    const usage: RealEstateUsage | null =
      form.type === 'real_estate' && form.usage
        ? (form.usage as RealEstateUsage)
        : null;
    const rentSavings =
      usage === 'living' && form.rentSavings ? Number(form.rentSavings) : null;

    if (editingId) {
      updateAsset(editingId, {
        name: form.name,
        type: form.type,
        value: form.value,
        currency: form.currency,
        yearlyGrowthRate: growthRate,
        usage,
        rentSavings,
      });
      setDialogOpen(false);
      return;
    }

    const assetId = addAsset({
      name: form.name,
      type: form.type,
      value: form.value,
      currency: form.currency,
      yearlyGrowthRate: growthRate,
      usage,
      rentSavings,
      linkedIncomeIds: [],
    });

    if (
      form.addRecurringCost &&
      form.recurringCostName.trim() &&
      form.recurringCostAmount > 0
    ) {
      addLiability({
        type: 'recurring',
        name: form.recurringCostName,
        amount: form.recurringCostAmount,
        frequency: form.recurringCostFrequency,
        currency: form.currency,
        linkedAssetId: assetId,
      });
    }

    if (
      form.addRentalIncome &&
      form.rentalIncomeName.trim() &&
      form.rentalIncomeAmount > 0
    ) {
      const incomeId = addIncome({
        name: form.rentalIncomeName,
        type: 'rental',
        amount: form.rentalIncomeAmount,
        frequency: 'monthly',
        isPassive: true,
        currency: form.currency,
        linkedAssetId: assetId,
      });
      updateAsset(assetId, { linkedIncomeIds: [incomeId] });
    }

    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    removeAsset(deleteTarget.id);
    setDeleteTarget(null);
  };

  const linkedLoan = (assetId: string) =>
    store.liabilities.find(
      (l) => l.type === 'loan' && l.linkedAssetId === assetId,
    );

  const linkedRecurrings = (assetId: string) =>
    store.liabilities.filter(
      (l) => l.type === 'recurring' && l.linkedAssetId === assetId,
    );

  const linkedIncomes = (asset: Asset) =>
    store.incomes.filter((i) => asset.linkedIncomeIds.includes(i.id));

  const isRealEstate = form.type === 'real_estate';
  const isLeasing = isRealEstate && form.usage === 'leasing';
  const isLiving = isRealEstate && form.usage === 'living';

  return (
    <Flex direction="column" gap="5" style={{ maxWidth: 720 }}>
      <Flex justify="between" align="center">
        <Heading size="7">Assets</Heading>
        <Button onClick={openAdd}>
          <Plus size={16} />
          Add Asset
        </Button>
      </Flex>

      {store.assets.length === 0 && (
        <Card>
          <Text size="3" color="gray" align="center">
            No assets yet. Add your first asset to get started.
          </Text>
        </Card>
      )}

      {store.assets.map((asset) => {
        const loan = linkedLoan(asset.id);
        const recurrings = linkedRecurrings(asset.id);
        const incomes = linkedIncomes(asset);
        return (
          <Card key={asset.id}>
            <Flex direction="column" gap="2">
              <Flex justify="between" align="center">
                <Flex align="center" gap="2">
                  <Text size="3" weight="bold">
                    {asset.name}
                  </Text>
                  <Badge color={TYPE_COLORS[asset.type]} size="1">
                    {TYPE_LABELS[asset.type]}
                  </Badge>
                  {asset.usage && (
                    <Badge size="1" variant="soft">
                      {USAGE_LABELS[asset.usage]}
                    </Badge>
                  )}
                </Flex>
                <Flex gap="2">
                  <Button
                    size="1"
                    variant="ghost"
                    onClick={() => openEdit(asset)}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    size="1"
                    variant="ghost"
                    color="red"
                    onClick={() => setDeleteTarget(asset)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </Flex>
              </Flex>

              <Flex gap="5" wrap="wrap">
                <Flex direction="column">
                  <Text size="1" color="gray">
                    Value
                  </Text>
                  <Text size="2" weight="bold">
                    {formatMoney(asset.value, asset.currency)}
                  </Text>
                </Flex>

                {asset.yearlyGrowthRate != null && (
                  <Flex direction="column">
                    <Text size="1" color="gray">
                      Growth Rate
                    </Text>
                    <Text size="2" weight="bold">
                      {(asset.yearlyGrowthRate * 100).toFixed(1)}%/yr
                    </Text>
                  </Flex>
                )}

                {asset.rentSavings != null && (
                  <Flex direction="column">
                    <Text size="1" color="gray">
                      Rent Savings
                    </Text>
                    <Text size="2" weight="bold">
                      {formatMoney(asset.rentSavings, asset.currency)}/mo
                    </Text>
                  </Flex>
                )}

                {loan && (
                  <Flex direction="column">
                    <Text size="1" color="gray">
                      Equity
                    </Text>
                    <Text size="2" weight="bold">
                      {formatMoney(
                        asset.value -
                          (loan as { currentBalance: number }).currentBalance,
                        asset.currency,
                      )}
                    </Text>
                  </Flex>
                )}
              </Flex>

              {incomes.length > 0 && (
                <Flex gap="1" align="center">
                  <Text size="1" color="gray">
                    Income:
                  </Text>
                  {incomes.map((inc) => (
                    <Badge key={inc.id} size="1" variant="soft" color="green">
                      {inc.name} —{' '}
                      {formatMoney(
                        toMonthly(inc.amount, inc.frequency),
                        inc.currency as Currency,
                      )}
                      /mo
                    </Badge>
                  ))}
                </Flex>
              )}

              {recurrings.length > 0 && (
                <Flex gap="1" align="center">
                  <Text size="1" color="gray">
                    Costs:
                  </Text>
                  {recurrings.map((r) => (
                    <Badge key={r.id} size="1" variant="soft" color="orange">
                      {r.name} —{' '}
                      {formatMoney(
                        toMonthly(
                          (r as { amount: number }).amount,
                          (r as { frequency: Frequency }).frequency,
                        ),
                        (r as { currency: string }).currency as Currency,
                      )}
                      /mo
                    </Badge>
                  ))}
                </Flex>
              )}

              {loan && (
                <Flex gap="1" align="center">
                  <Text size="1" color="gray">
                    Loan:
                  </Text>
                  <Badge size="1" variant="soft" color="red">
                    {loan.name} —{' '}
                    {formatMoney(
                      (loan as { currentBalance: number }).currentBalance,
                      asset.currency,
                    )}{' '}
                    remaining
                  </Badge>
                </Flex>
              )}
            </Flex>
          </Card>
        );
      })}

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Content maxWidth="500px">
          <Dialog.Title>{editingId ? 'Edit Asset' : 'Add Asset'}</Dialog.Title>

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
                placeholder="e.g. My Apartment"
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
                      type: v as AssetType,
                      usage: v === 'real_estate' ? f.usage : '',
                      rentSavings: v === 'real_estate' ? f.rentSavings : '',
                    }))
                  }
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    {ASSET_TYPES.map((t) => (
                      <Select.Item key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
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
                  </Select.Content>
                </Select.Root>
              </div>
            </Flex>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Value</span>
                </Text>
                <TextField.Root
                  type="number"
                  value={form.value || ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      value: Number(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                />
              </div>
              <div style={{ flex: 1 }}>
                <Text size="2" weight="medium" mb="1" asChild>
                  <span>Yearly Growth Rate (%)</span>
                </Text>
                <TextField.Root
                  type="number"
                  step="0.1"
                  value={form.yearlyGrowthRate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, yearlyGrowthRate: e.target.value }))
                  }
                  placeholder="e.g. 3.0"
                />
              </div>
            </Flex>

            {isRealEstate && (
              <>
                <div>
                  <Text size="2" weight="medium" mb="1" asChild>
                    <span>Usage</span>
                  </Text>
                  <Select.Root
                    value={form.usage || '_none'}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        usage: v === '_none' ? '' : (v as RealEstateUsage),
                        addRentalIncome:
                          v === 'leasing' ? f.addRentalIncome : false,
                      }))
                    }
                  >
                    <Select.Trigger style={{ width: '100%' }} />
                    <Select.Content>
                      <Select.Item value="_none">Not specified</Select.Item>
                      <Select.Item value="living">Living</Select.Item>
                      <Select.Item value="leasing">Leasing</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </div>

                {isLiving && (
                  <div>
                    <Text size="2" weight="medium" mb="1" asChild>
                      <span>Monthly Rent Savings</span>
                    </Text>
                    <TextField.Root
                      type="number"
                      value={form.rentSavings}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, rentSavings: e.target.value }))
                      }
                      placeholder="What you'd pay in rent otherwise"
                    />
                  </div>
                )}
              </>
            )}

            {!editingId && isLeasing && (
              <Card variant="surface">
                <Flex direction="column" gap="2">
                  <Flex asChild gap="2" align="center">
                    <Text size="2" weight="bold">
                      <Checkbox
                        checked={form.addRentalIncome}
                        onCheckedChange={(c) =>
                          setForm((f) => ({
                            ...f,
                            addRentalIncome: c === true,
                            rentalIncomeName:
                              c === true && !f.rentalIncomeName
                                ? `${f.name} Rent`
                                : f.rentalIncomeName,
                          }))
                        }
                      />
                      Create rental income
                    </Text>
                  </Flex>
                  {form.addRentalIncome && (
                    <Flex gap="3">
                      <div style={{ flex: 1 }}>
                        <Text size="1" weight="medium" asChild>
                          <span>Name</span>
                        </Text>
                        <TextField.Root
                          value={form.rentalIncomeName}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              rentalIncomeName: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text size="1" weight="medium" asChild>
                          <span>Monthly Rent</span>
                        </Text>
                        <TextField.Root
                          type="number"
                          value={form.rentalIncomeAmount || ''}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              rentalIncomeAmount: Number(e.target.value) || 0,
                            }))
                          }
                          placeholder="0"
                        />
                      </div>
                    </Flex>
                  )}
                </Flex>
              </Card>
            )}

            {!editingId && (
              <Card variant="surface">
                <Flex direction="column" gap="2">
                  <Flex asChild gap="2" align="center">
                    <Text size="2" weight="bold">
                      <Checkbox
                        checked={form.addRecurringCost}
                        onCheckedChange={(c) =>
                          setForm((f) => ({
                            ...f,
                            addRecurringCost: c === true,
                            recurringCostName:
                              c === true && !f.recurringCostName
                                ? f.type === 'real_estate'
                                  ? `${f.name} Property Tax`
                                  : `${f.name} Cost`
                                : f.recurringCostName,
                          }))
                        }
                      />
                      Add ownership cost
                    </Text>
                  </Flex>
                  {form.addRecurringCost && (
                    <Flex gap="3">
                      <div style={{ flex: 2 }}>
                        <Text size="1" weight="medium" asChild>
                          <span>Name</span>
                        </Text>
                        <TextField.Root
                          value={form.recurringCostName}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              recurringCostName: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text size="1" weight="medium" asChild>
                          <span>Amount</span>
                        </Text>
                        <TextField.Root
                          type="number"
                          value={form.recurringCostAmount || ''}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              recurringCostAmount: Number(e.target.value) || 0,
                            }))
                          }
                          placeholder="0"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text size="1" weight="medium" asChild>
                          <span>Frequency</span>
                        </Text>
                        <Select.Root
                          value={form.recurringCostFrequency}
                          onValueChange={(v) =>
                            setForm((f) => ({
                              ...f,
                              recurringCostFrequency: v as Frequency,
                            }))
                          }
                        >
                          <Select.Trigger style={{ width: '100%' }} />
                          <Select.Content>
                            {(
                              [
                                'monthly',
                                'quarterly',
                                'annually',
                              ] as Frequency[]
                            ).map((freq) => (
                              <Select.Item key={freq} value={freq}>
                                {FREQ_LABELS[freq]}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      </div>
                    </Flex>
                  )}
                </Flex>
              </Card>
            )}
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
          <AlertDialog.Title>Delete Asset</AlertDialog.Title>
          <AlertDialog.Description>
            {deleteTarget && linkedLoan(deleteTarget.id) ? (
              <>
                <strong>{deleteTarget.name}</strong> has a linked loan. Deleting
                this asset will not remove the loan. Continue?
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
