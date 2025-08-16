'use client';

import { useState } from 'react';
import { Flex } from '@radix-ui/themes';
import InputForm, { InputValues } from '@/components/InputForm';
import ResultsDisplay from '@/components/ResultsDisplay';
import YearSlider from '@/components/YearSlider';
import MilestoneMessage from '@/components/MilestoneMessage';
import { CalculationResult, computeResults, DEFAULT_INTEREST_RATE } from '@/lib/calculations';

export default function Home() {
  const [input, setInput] = useState<InputValues | null>(null);
  const [years, setYears] = useState(3);
  const [loanTerm, setLoanTerm] = useState(10);
  const [interestRate, setInterestRate] = useState(100 * DEFAULT_INTEREST_RATE);
  const [results, setResults] = useState<CalculationResult | null>(null);

  const recompute = (
    values: InputValues,
    yrs = years,
    term = loanTerm,
    rate = interestRate,
  ) => {
    const res = computeResults({
      monthlyRent: values.monthlyRent,
      cash: values.cash,
      years: yrs,
      loanTerm: term,
      interestRate: rate / 100,
    });
    setResults(res);
  };

  const handleCalculate = (values: InputValues) => {
    setInput(values);
    recompute(values);
  };

  const handleYearsChange = (v: number) => {
    setYears(v);
    if (input) {
      recompute(input, v, loanTerm, interestRate);
    }
  };

  const handleLoanTermChange = (v: number) => {
    setLoanTerm(v);
    if (input) {
      recompute(input, years, v, interestRate);
    }
  };

  const handleInterestRateChange = (v: number) => {
    setInterestRate(v);
    if (input) {
      recompute(input, years, loanTerm, v);
    }
  };

  return (
    <Flex direction="column" gap="6" p="6" maxWidth="600px" mx="auto">
      <InputForm onCalculate={handleCalculate} />
      {results && input && (
        <>
          <ResultsDisplay
            results={results}
            loanTerm={loanTerm}
            interestRate={interestRate}
            onLoanTermChange={handleLoanTermChange}
            onInterestRateChange={handleInterestRateChange}
          />
          <YearSlider years={years} onChange={handleYearsChange} />
          <MilestoneMessage years={years} metrics={results.milestone} />
        </>
      )}
    </Flex>
  );
}
