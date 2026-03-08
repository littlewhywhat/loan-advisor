import {
  AlertDialog,
  Badge,
  Button,
  Card,
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
import { formatMoney } from '@/lib/format';
import type { Asset, AssetInput, AssetType, Currency } from '@/types/finance';

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

function emptyForm(): AssetInput {
  return {
    name: '',
    type: 'cash',
    value: 0,
    currency: 'CZK',
    linkedIncomeIds: [],
  };
}

function assetToForm(a: Asset): AssetInput {
  return {
    name: a.name,
    type: a.type,
    value: a.value,
    currency: a.currency,
    linkedIncomeIds: a.linkedIncomeIds,
  };
}

export default function AssetsPage() {
  const { store, addAsset, updateAsset, removeAsset } = useFinance();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssetInput>(emptyForm);
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
    if (editingId) {
      updateAsset(editingId, form);
    } else {
      addAsset(form);
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

  const linkedIncomes = (asset: Asset) =>
    store.incomes.filter((i) => asset.linkedIncomeIds.includes(i.id));

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

              <Flex justify="between" align="center">
                <Text size="2" color="gray">
                  Current Value
                </Text>
                <Text size="3" weight="bold">
                  {formatMoney(asset.value, asset.currency as Currency)}
                </Text>
              </Flex>

              {incomes.length > 0 && (
                <Flex justify="between" align="center">
                  <Text size="2" color="gray">
                    Linked Income
                  </Text>
                  <Flex gap="1">
                    {incomes.map((inc) => (
                      <Badge key={inc.id} size="1" variant="soft">
                        {inc.name}
                      </Badge>
                    ))}
                  </Flex>
                </Flex>
              )}

              {loan && (
                <Flex justify="between" align="center">
                  <Text size="2" color="gray">
                    Linked Loan
                  </Text>
                  <Text size="2">
                    {loan.name} —{' '}
                    {formatMoney(
                      (loan as { currentBalance: number }).currentBalance,
                      asset.currency as Currency,
                    )}{' '}
                    remaining
                  </Text>
                </Flex>
              )}
            </Flex>
          </Card>
        );
      })}

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Content maxWidth="450px">
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
                    setForm((f) => ({ ...f, type: v as AssetType }))
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

            <div>
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
