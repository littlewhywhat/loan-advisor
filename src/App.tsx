import { Theme } from '@radix-ui/themes';
import { Route, Routes } from 'react-router-dom';
import { FinanceProvider } from '@/context/FinanceProvider';
import HomePage from '@/routes/HomePage';

export default function App() {
  return (
    <Theme>
      <FinanceProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </FinanceProvider>
    </Theme>
  );
}
