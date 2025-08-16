'use client';

import { useState } from 'react';
import { Flex } from '@radix-ui/themes';
import InputForm, { InputValues } from '@/components/InputForm';
import ResultsDisplay from '@/components/ResultsDisplay';
import YearSlider from '@/components/YearSlider';
import MilestoneMessage from '@/components/MilestoneMessage';
import { CalculationResult, computeResults } from '@/lib/calculations';

export default function Home() {
  const [input, setInput] = useState<InputValues | null>(null);
  const [years, setYears] = useState(3);
  const [results, setResults] = useState<CalculationResult | null>(null);

  const handleCalculate = (values: InputValues) => {
    setInput(values);
    const res = computeResults({
      monthlyRent: values.monthlyRent,
      cash: values.cash,
      years,
      loanTerm: values.loanTerm,
    });
    setResults(res);
  };

  const handleYearsChange = (v: number) => {
    setYears(v);
    if (input) {
      const res = computeResults({
        monthlyRent: input.monthlyRent,
        cash: input.cash,
        years: v,
        loanTerm: input.loanTerm,
      });
      setResults(res);
    }
  };

  return (
    <Flex direction="column" gap="6" p="6" maxWidth="600px" mx="auto">
      <InputForm onCalculate={handleCalculate} />
      {results && (
        <>
          <ResultsDisplay results={results} />
          <YearSlider years={years} onChange={handleYearsChange} />
          <MilestoneMessage years={years} metrics={results.milestone} />
        </>
      )}
    </Flex>
  );
}
