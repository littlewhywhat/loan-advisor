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
import { Archive, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useEvents } from '@/context/EventProvider';
import {
  findOwnerEvent,
  isEventEditable,
  isStandaloneAsset,
  todayStr,
} from '@/lib/eventUtils';
import { fmtMoney, formatPct } from '@/lib/format';
import type { AddAssetEvent, Asset, Currency } from '@/types/events';

const KIND_LABELS: Record<Asset['kind'], string> = {
  flat: 'Flat',
  cash: 'Cash',
};

const KIND_COLORS: Record<Asset['kind'], 'blue' | 'green'> = {
  flat: 'blue',
  cash: 'green',
};

type AssetForm = {
  name: string;
  kind: Asset['kind'];
  value: number;
  currency: Currency;
  growthRate: number;
};

function emptyAssetForm(): AssetForm {
  return { name: '', kind: 'cash', value: 0, currency: 'CZK', growthRate: 0 };
}

function assetToForm(a: Asset): AssetForm {
  return {
    name: a.name,
    kind: a.kind,
    value: a.value.amount,
    currency: a.value.currency,
    growthRate: a.growthRate * 100,
  };
}

export default function AssetsPage() {
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
  const [form, setForm] = useState<AssetForm>(emptyAssetForm);
  const [archiveTarget, setArchiveTarget] = useState<Asset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyAssetForm());
    setDialogOpen(true);
  };

  const openEdit = (asset: Asset) => {
    setEditingId(asset.id);
    setForm(assetToForm(asset));
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const assetData: Asset = {
      id: editingId ?? crypto.randomUUID(),
      name: form.name,
      kind: form.kind,
      value: { amount: form.value, currency: form.currency },
      growthRate: form.growthRate / 100,
    } as Asset;

    if (editingId) {
      const owner = findOwnerEvent(events, editingId);
      if (owner?.type === 'add_asset') {
        updateEvent(
          owner.id,
          (e) =>
            ({
              ...e,
              asset: assetData,
            }) as AddAssetEvent,
        );
      }
    } else {
      addEvent({
        type: 'add_asset',
        date: todayStr(),
        asset: assetData,
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

  const handleRestore = (asset: Asset) => {
    const owner = findOwnerEvent(events, asset.id);
    if (owner) restoreEvent(owner.id);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const owner = findOwnerEvent(events, deleteTarget.id);
    if (owner) deleteEvent(owner.id);
    setDeleteTarget(null);
  };

  return (
    <Flex direction="column" gap="5" style={{ maxWidth: 720 }}>
      <Flex justify="between" align="center">
        <Heading size="7">Assets</Heading>
        <Button size="2" onClick={openAdd}>
          <Plus size={16} />
          Add Asset
        </Button>
      </Flex>

      {derived.assets.length === 0 && (
        <Card>
          <Text size="3" color="gray" align="center">
            No assets yet.
          </Text>
        </Card>
      )}

      {derived.assets.map((asset) => {
        const standalone = isStandaloneAsset(events, asset.id);
        const owner = findOwnerEvent(events, asset.id);
        const editable = standalone && owner && isEventEditable(owner);
        return (
          <Card key={asset.id}>
            <Flex direction="column" gap="2">
              <Flex justify="between" align="center">
                <Flex align="center" gap="2">
                  <Text size="3" weight="bold">
                    {asset.name}
                  </Text>
                  <Badge color={KIND_COLORS[asset.kind]} size="1">
                    {KIND_LABELS[asset.kind]}
                  </Badge>
                  {!standalone && owner && (
                    <Badge size="1" variant="soft" color="gray">
                      from {owner.type.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </Flex>
                {editable && (
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
                      onClick={() => setArchiveTarget(asset)}
                    >
                      <Archive size={14} />
                    </Button>
                  </Flex>
                )}
              </Flex>

              <Flex gap="5" wrap="wrap">
                <Flex direction="column">
                  <Text size="1" color="gray">
                    Value
                  </Text>
                  <Text size="2" weight="bold">
                    {fmtMoney(asset.value)}
                  </Text>
                </Flex>
                {asset.growthRate !== 0 && (
                  <Flex direction="column">
                    <Text size="1" color="gray">
                      Growth Rate
                    </Text>
                    <Text size="2" weight="bold">
                      {formatPct(asset.growthRate)}/yr
                    </Text>
                  </Flex>
                )}
              </Flex>

              {owner?.type === 'take_mortgage' && (
                <Flex gap="3" wrap="wrap">
                  <Flex gap="1" align="center">
                    <Text size="1" color="gray">
                      Mortgage:
                    </Text>
                    <Badge size="1" variant="soft" color="red">
                      {owner.mortgage.name} {fmtMoney(owner.mortgage.value)}
                    </Badge>
                  </Flex>
                  <Flex gap="1" align="center">
                    <Text size="1" color="gray">
                      Payment:
                    </Text>
                    <Badge size="1" variant="soft" color="orange">
                      {fmtMoney(owner.expense.amount)}/mo
                    </Badge>
                  </Flex>
                  {owner.rental && (
                    <Flex gap="1" align="center">
                      <Text size="1" color="gray">
                        Rental income:
                      </Text>
                      <Badge size="1" variant="soft" color="green">
                        {fmtMoney(owner.income.amount)}/mo
                      </Badge>
                    </Flex>
                  )}
                </Flex>
              )}

              {owner?.type === 'take_personal_loan' && (
                <Flex gap="3" wrap="wrap">
                  <Flex gap="1" align="center">
                    <Text size="1" color="gray">
                      Loan:
                    </Text>
                    <Badge size="1" variant="soft" color="red">
                      {owner.loan.name} {fmtMoney(owner.loan.value)}
                    </Badge>
                  </Flex>
                  <Flex gap="1" align="center">
                    <Text size="1" color="gray">
                      Payment:
                    </Text>
                    <Badge size="1" variant="soft" color="orange">
                      {fmtMoney(owner.expense.amount)}/mo
                    </Badge>
                  </Flex>
                </Flex>
              )}
            </Flex>
          </Card>
        );
      })}

      {archivedDerived.assets.length > 0 && (
        <>
          <Heading size="4" color="gray" mt="4">
            Archived
          </Heading>
          {archivedDerived.assets.map((asset) => (
            <Card key={asset.id} style={{ opacity: 0.6 }}>
              <Flex justify="between" align="center">
                <Flex align="center" gap="2">
                  <Text size="3" weight="bold">
                    {asset.name}
                  </Text>
                  <Badge color={KIND_COLORS[asset.kind]} size="1">
                    {KIND_LABELS[asset.kind]}
                  </Badge>
                  <Text size="2" color="gray">
                    {fmtMoney(asset.value)}
                  </Text>
                </Flex>
                <Flex gap="2">
                  <Button
                    size="1"
                    variant="ghost"
                    onClick={() => handleRestore(asset)}
                  >
                    <RotateCcw size={14} />
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
            </Card>
          ))}
        </>
      )}

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
                placeholder="e.g. Savings"
              />
            </div>

            <div>
              <Text size="2" weight="medium" mb="1" asChild>
                <span>Kind</span>
              </Text>
              <Select.Root
                value={form.kind}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, kind: v as Asset['kind'] }))
                }
              >
                <Select.Trigger style={{ width: '100%' }} />
                <Select.Content>
                  <Select.Item value="cash">Cash</Select.Item>
                  <Select.Item value="flat">Flat</Select.Item>
                </Select.Content>
              </Select.Root>
            </div>

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
                <span>Growth Rate (%/yr)</span>
              </Text>
              <TextField.Root
                type="number"
                step="0.1"
                value={form.growthRate || ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    growthRate: Number(e.target.value) || 0,
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
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
      >
        <AlertDialog.Content maxWidth="400px">
          <AlertDialog.Title>Archive Asset</AlertDialog.Title>
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
          <AlertDialog.Title>Delete Asset</AlertDialog.Title>
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
    </Flex>
  );
}
