import { createContext, type ReactNode, useContext } from 'react';
import { useFinanceState } from '@/hooks/useFinanceState';

type FinanceContextValue = ReturnType<typeof useFinanceState>;

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const finance = useFinanceState();
  return (
    <FinanceContext.Provider value={finance}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return ctx;
}
