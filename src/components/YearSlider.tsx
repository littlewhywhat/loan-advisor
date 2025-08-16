'use client';

import { Flex, Text } from '@radix-ui/themes';

interface Props {
  years: number;
  onChange: (value: number) => void;
}

export default function YearSlider({ years, onChange }: Props) {
  return (
    <Flex direction="column" gap="2" maxWidth="400px">
      <Text>
        How many years are you ok with paying only interest? ({years})
      </Text>
      <input
        type="range"
        min={1}
        max={10}
        value={years}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Flex>
  );
}
