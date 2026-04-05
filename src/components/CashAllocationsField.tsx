import { Button, Flex, Select, Text, TextField } from '@radix-ui/themes';
import { Plus, Trash2 } from 'lucide-react';
import type { BuyAssetFormAllocation } from '@/lib/eventBuilders';
import { formatMoney } from '@/lib/format';
import type { Cash, Currency } from '@/types/events';

type Props = {
  allocations: BuyAssetFormAllocation[];
  cashAssets: Cash[];
  currency: Currency;
  totalValue?: number;
  onChange: (allocations: BuyAssetFormAllocation[]) => void;
};

export default function CashAllocationsField({
  allocations,
  cashAssets,
  currency,
  totalValue,
  onChange,
}: Props) {
  const usedIds = new Set(allocations.map((a) => a.cashAssetId));
  const allocatedTotal = allocations.reduce((sum, a) => sum + a.amount, 0);

  const addAllocation = () => {
    const available = cashAssets.filter((c) => !usedIds.has(c.id));
    if (available.length === 0) return;
    onChange([...allocations, { cashAssetId: available[0].id, amount: 0 }]);
  };

  const removeAllocation = (idx: number) => {
    onChange(allocations.filter((_, i) => i !== idx));
  };

  const updateAllocation = (
    idx: number,
    patch: { cashAssetId?: string; amount?: number },
  ) => {
    onChange(allocations.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  return (
    <Flex direction="column" gap="2">
      <Flex justify="between" align="center">
        <Text size="2" weight="bold">
          Cash Sources
        </Text>
        <Button
          size="1"
          variant="soft"
          onClick={addAllocation}
          disabled={cashAssets.filter((c) => !usedIds.has(c.id)).length === 0}
        >
          <Plus size={12} /> Add Source
        </Button>
      </Flex>
      {allocations.map((alloc, idx) => {
        const cashAsset = cashAssets.find((c) => c.id === alloc.cashAssetId);
        const availableForRow = cashAssets.filter(
          (c) => c.id === alloc.cashAssetId || !usedIds.has(c.id),
        );
        return (
          <Flex key={alloc.cashAssetId || idx} gap="2" align="end">
            <div style={{ flex: 2 }}>
              <Text size="1" color="gray">
                Source
              </Text>
              <Select.Root
                value={alloc.cashAssetId}
                onValueChange={(v) => updateAllocation(idx, { cashAssetId: v })}
              >
                <Select.Trigger style={{ width: '100%' }} />
                <Select.Content>
                  {availableForRow.map((c) => (
                    <Select.Item key={c.id} value={c.id}>
                      {c.name} ({formatMoney(c.value.amount, c.value.currency)})
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
            <div style={{ flex: 1 }}>
              <Text size="1" color="gray">
                Amount
              </Text>
              <TextField.Root
                type="number"
                value={alloc.amount || ''}
                onChange={(e) =>
                  updateAllocation(idx, { amount: Number(e.target.value) || 0 })
                }
                max={cashAsset?.value.amount}
              />
            </div>
            <Button
              size="1"
              variant="ghost"
              color="red"
              onClick={() => removeAllocation(idx)}
            >
              <Trash2 size={14} />
            </Button>
          </Flex>
        );
      })}
      {totalValue != null && totalValue > 0 && (
        <Flex justify="between">
          <Text size="2" color="gray">
            Allocated
          </Text>
          <Text
            size="2"
            weight="bold"
            color={
              allocatedTotal === totalValue
                ? 'green'
                : allocatedTotal < totalValue
                  ? 'orange'
                  : 'red'
            }
          >
            {formatMoney(allocatedTotal, currency)} /{' '}
            {formatMoney(totalValue, currency)}
          </Text>
        </Flex>
      )}
    </Flex>
  );
}
