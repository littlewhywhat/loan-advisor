import { Theme } from '@radix-ui/themes';
import { Route, Routes } from 'react-router-dom';
import HomePage from '@/routes/HomePage';

export default function App() {
  return (
    <Theme>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </Theme>
  );
}
