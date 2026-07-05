import { Select } from '@radix-ui/themes';
import type { Currency } from '@/types/events';

type CurrencySelectProps = {
  value: Currency;
  onValueChange: (value: Currency) => void;
};

export default function CurrencySelect({
  value,
  onValueChange,
}: CurrencySelectProps) {
  return (
    <Select.Root
      value={value}
      onValueChange={(v) => onValueChange(v as Currency)}
    >
      <Select.Trigger style={{ width: '100%' }} />
      <Select.Content>
        <Select.Item value="CZK">CZK</Select.Item>
        <Select.Item value="EUR">EUR</Select.Item>
        <Select.Item value="USD">USD</Select.Item>
      </Select.Content>
    </Select.Root>
  );
}
