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
    expenseDuringPeriod,
    expenseAfterPeriod,
  } = metrics;
  const percent = totalInterest ? (paidInterest / totalInterest) * 100 : 0;
  return (
    <Card>
      <Text>
        In {years} years of paying {expenseDuringPeriod.toFixed(0)} CZK each
        month (loan payment + your rent - rental income), you will have paid
        off {paidInterest.toFixed(0)} CZK of loan interest
        ({percent.toFixed(1)}% of total). For the remaining {remainingYears}
        years, your average monthly interest drops to
        ~{monthlyInterestCost.toFixed(0)} CZK, making your effective expense
        about {expenseAfterPeriod.toFixed(0)} CZK per month. The rest
        (~{netToPrincipal.toFixed(0)} CZK) of your loan payment builds your
        flat’s principal value.
      </Text>
    </Card>
  );
}
