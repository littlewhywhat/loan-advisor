'use client';

import { useState } from 'react';
import { Flex } from '@radix-ui/themes';
import InputForm, { InputValues } from '@/components/InputForm';
import ResultsDisplay from '@/components/ResultsDisplay';
import LoanTermInput from '@/components/LoanTermInput';
import YearSlider from '@/components/YearSlider';
import MilestoneMessage from '@/components/MilestoneMessage';
import { CalculationResult, computeResults } from '@/lib/calculations';

export default function Home() {
  const [input, setInput] = useState<InputValues | null>(null);
  const [years, setYears] = useState(3);
  const [loanTerm, setLoanTerm] = useState(10);
  const [results, setResults] = useState<CalculationResult | null>(null);

  const handleCalculate = (values: InputValues) => {
    setInput(values);
    const res = computeResults({
      monthlyRent: values.monthlyRent,
      cash: values.cash,
      years,
      loanTerm,
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
        loanTerm,
      });
      setResults(res);
    }
  };

  const handleLoanTermChange = (v: number) => {
    setLoanTerm(v);
    if (input) {
      const res = computeResults({
        monthlyRent: input.monthlyRent,
        cash: input.cash,
        years,
        loanTerm: v,
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
          <LoanTermInput loanTerm={loanTerm} onChange={handleLoanTermChange} />
          <YearSlider years={years} onChange={handleYearsChange} />
          <MilestoneMessage years={years} metrics={results.milestone} />
        </>
      )}
    </Flex>
  );
}
