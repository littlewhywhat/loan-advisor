import { Theme } from '@radix-ui/themes';
import { Route, Routes } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { FinanceProvider } from '@/context/FinanceProvider';
import AssetsPage from '@/routes/AssetsPage';
import DashboardPage from '@/routes/DashboardPage';
import LiabilitiesPage from '@/routes/LiabilitiesPage';
import LoanCalculatorPage from '@/routes/LoanCalculatorPage';
import SimulatorPage from '@/routes/SimulatorPage';

export default function App() {
  return (
    <Theme>
      <FinanceProvider>
        <AppLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/liabilities" element={<LiabilitiesPage />} />
            <Route path="/simulator" element={<SimulatorPage />} />
            <Route path="/calculator" element={<LoanCalculatorPage />} />
          </Routes>
        </AppLayout>
      </FinanceProvider>
    </Theme>
  );
}
