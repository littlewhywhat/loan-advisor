'use client';

import { Flex, Text, TextField } from '@radix-ui/themes';

interface Props {
  loanTerm: number;
  onChange: (value: number) => void;
}

export default function LoanTermInput({ loanTerm, onChange }: Props) {
  return (
    <Flex direction="column" gap="1" maxWidth="200px">
      <Text as="label" htmlFor="loanTerm">
        Loan Term (years)
      </Text>
      <TextField.Root
        id="loanTerm"
        type="number"
        placeholder="10"
        value={loanTerm}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(Number(e.target.value) || 0)
        }
      />
    </Flex>
  );
}
