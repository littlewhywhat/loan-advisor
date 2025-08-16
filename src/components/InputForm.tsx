'use client';

import { useState } from 'react';
import { Button, Flex, Select, Text, TextField } from '@radix-ui/themes';

export interface InputValues {
  monthlyRent: number;
  cash: number;
  monthlySavings: number;
  city: string;
}

const defaults = {
  monthlyRent: 20000,
  cash: 1000000,
  monthlySavings: 15000,
};

interface Props {
  onCalculate: (values: InputValues) => void;
}

export default function InputForm({ onCalculate }: Props) {
  const [monthlyRent, setMonthlyRent] = useState('');
  const [cash, setCash] = useState('');
  const [savings, setSavings] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate({
      monthlyRent: monthlyRent ? Number(monthlyRent) : defaults.monthlyRent,
      cash: cash ? Number(cash) : defaults.cash,
      monthlySavings: savings ? Number(savings) : defaults.monthlySavings,
      city: 'Prague',
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="3" maxWidth="400px">
        <div>
          <Text as="label" htmlFor="monthlyRent">
            Monthly Rent (CZK)
          </Text>
          <TextField.Root
            id="monthlyRent"
            type="number"
            placeholder={String(defaults.monthlyRent)}
            value={monthlyRent}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setMonthlyRent(e.target.value)
            }
          />
        </div>

        <div>
          <Text as="label" htmlFor="savings">
            Monthly Savings (CZK)
          </Text>
          <TextField.Root
            id="savings"
            type="number"
            placeholder={String(defaults.monthlySavings)}
            value={savings}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSavings(e.target.value)
            }
          />
        </div>

        <div>
          <Text>City</Text>
          <Select.Root defaultValue="Prague" disabled>
            <Select.Trigger />
            <Select.Content>
              <Select.Item value="Prague">Prague</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>

        <div>
          <Text as="label" htmlFor="cash">
            Cash in Bank (CZK)
          </Text>
          <TextField.Root
            id="cash"
            type="number"
            placeholder={String(defaults.cash)}
            value={cash}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCash(e.target.value)
            }
          />
        </div>
        <Button type="submit">Calculate</Button>
        <Text size="1" color="gray">
          Defaults are used if fields are left blank.
        </Text>
      </Flex>
    </form>
  );
}
