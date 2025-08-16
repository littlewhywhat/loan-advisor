'use client';

import { Card, Text } from '@radix-ui/themes';
import { MilestoneMetrics } from '@/lib/calculations';

interface Props {
  years: number;
  metrics: MilestoneMetrics;
}

export default function MilestoneMessage({ years, metrics }: Props) {
  const {
    paidInterest,
    totalInterest,
    remainingYears,
    monthlyInterestCost,
    netToPrincipal,
  } = metrics;
  const percent = totalInterest ? (paidInterest / totalInterest) * 100 : 0;
  return (
    <Card>
      <Text>
        In {years} years you will have paid off {paidInterest.toFixed(0)} CZK of
        loan interest ({percent.toFixed(1)}% of total). For the remaining
        {` ${remainingYears} `}years, your average monthly interest drops to
        ~{monthlyInterestCost.toFixed(0)} CZK. That means from each payment,
        around {netToPrincipal.toFixed(0)} CZK goes directly into building your
        flat’s principal value.
      </Text>
    </Card>
  );
}
