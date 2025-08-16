'use client';

import { useState } from 'react';
import { Card, Flex, Heading, Text, TextField } from '@radix-ui/themes';
import { CalculationResult } from '@/lib/calculations';

interface Props {
  results: CalculationResult;
  loanTerm: number;
  interestRate: number;
  onLoanTermChange: (value: number) => void;
  onInterestRateChange: (value: number) => void;
}

export default function ResultsDisplay({
  results,
  loanTerm,
  interestRate,
  onLoanTermChange,
  onInterestRateChange,
}: Props) {
  const { flatBudget, flatSize, loan, rentIncome, monthlyPayment, milestone } =
    results;
  const [rentExpanded, setRentExpanded] = useState(false);
  const [loanExpanded, setLoanExpanded] = useState(false);
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
      <Card style={{ cursor: 'pointer' }} onClick={() => setLoanExpanded((e) => !e)}>
        <Heading size="3">Loan amount used</Heading>
        <Text>{loan.toFixed(0)} CZK</Text>
        {loanExpanded && (
          <Flex direction="column" mt="2" gap="2" onClick={(e) => e.stopPropagation()}>
            <Flex direction="column" gap="1">
              <Text as="label" htmlFor="loanTerm">Loan Term (years)</Text>
              <TextField.Root
                id="loanTerm"
                type="number"
                value={loanTerm}
                placeholder="10"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onLoanTermChange(Number(e.target.value) || 0)
                }
              />
            </Flex>
            <Flex direction="column" gap="1">
              <Text as="label" htmlFor="interestRate">Annual Rate (%)</Text>
              <TextField.Root
                id="interestRate"
                type="number"
                value={interestRate}
                placeholder={String(interestRate)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onInterestRateChange(Number(e.target.value) || 0)
                }
              />
            </Flex>
            <Text>Monthly payment: {monthlyPayment.toFixed(0)} CZK</Text>
            <Text>Total interest: {milestone.totalInterest.toFixed(0)} CZK</Text>
          </Flex>
        )}
      </Card>
      <Card style={{ cursor: 'pointer' }} onClick={() => setRentExpanded((e) => !e)}>
        <Heading size="3">Expected monthly rent income</Heading>
        <Text>{rentIncome.net.toFixed(0)} CZK net</Text>
        {rentExpanded && (
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
