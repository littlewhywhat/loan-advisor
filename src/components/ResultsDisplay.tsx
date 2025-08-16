'use client';

import { useState } from 'react';
import { Card, Flex, Heading, Text } from '@radix-ui/themes';
import { CalculationResult } from '@/lib/calculations';

interface Props {
  results: CalculationResult;
}

export default function ResultsDisplay({ results }: Props) {
  const { flatBudget, flatSize, loan, rentIncome } = results;
  const [expanded, setExpanded] = useState(false);
  return (
    <Flex direction="column" gap="3" maxWidth="400px">
      <Card>
        <Heading size="3">Flat you can afford</Heading>
        <Text>{flatBudget.toFixed(0)} CZK</Text>
      </Card>
      <Card>
        <Heading size="3">Flat size</Heading>
        <Text>{flatSize.toFixed(1)} m²</Text>
      </Card>
      <Card>
        <Heading size="3">Loan amount used</Heading>
        <Text>{loan.toFixed(0)} CZK</Text>
      </Card>
      <Card style={{ cursor: 'pointer' }} onClick={() => setExpanded((e) => !e)}>
        <Heading size="3">Expected monthly rent income</Heading>
        <Text>{rentIncome.net.toFixed(0)} CZK net</Text>
        {expanded && (
          <Flex direction="column" mt="2">
            <Text>Gross: {rentIncome.gross.toFixed(0)} CZK</Text>
            <Text>Costs: {rentIncome.costs.toFixed(0)} CZK</Text>
            <Text>Tax: {rentIncome.tax.toFixed(0)} CZK</Text>
          </Flex>
        )}
      </Card>
    </Flex>
  );
}
