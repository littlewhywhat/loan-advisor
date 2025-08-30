"use client";

import { createContext, useContext, useState, type ReactNode } from 'react';

export type Currency = 'CZK' | 'USD' | 'EUR';

interface FinancialState {
  principal: number;
  loanAPR: number;
  termYears: number;
  investAPR: number;
  currency: Currency;
  setPrincipal: (n: number) => void;
  setLoanAPR: (n: number) => void;
  setTermYears: (n: number) => void;
  setInvestAPR: (n: number) => void;
  setCurrency: (c: Currency) => void;
}

const FinancialContext = createContext<FinancialState | undefined>(undefined);

export function FinancialProvider({ children }: { children: ReactNode }) {
  const [principal, setPrincipal] = useState(100000);
  const [loanAPR, setLoanAPR] = useState(6);
  const [termYears, setTermYears] = useState(10);
  const [investAPR, setInvestAPR] = useState(6);
  const [currency, setCurrency] = useState<Currency>('CZK');

  return (
    <FinancialContext.Provider
      value={{
        principal,
        loanAPR,
        termYears,
        investAPR,
        currency,
        setPrincipal,
        setLoanAPR,
        setTermYears,
        setInvestAPR,
        setCurrency,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
}

export function useFinancial() {
  const ctx = useContext(FinancialContext);
  if (!ctx) throw new Error('useFinancial must be used within FinancialProvider');
  return ctx;
}
