'use client';

import { useState } from 'react';
import ForwardCalculator from '@/components/ForwardCalculator';
import ReverseCalculator from '@/components/ReverseCalculator';

type Currency = 'CZK' | 'USD' | 'EUR';

export default function Home() {
  const [currency, setCurrency] = useState<Currency>('CZK');
  const [tab, setTab] = useState<'forward' | 'reverse'>('forward');

  return (
    <main style={{ padding: '1rem', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h1>Real Compound Interest Calculator</h1>
        <p title="inflation-adjusted = today's purchasing power">
          Calculate nominal and inflation-adjusted growth
        </p>
      </header>
      <div className="tabs">
        <button
          className={tab === 'forward' ? 'active' : ''}
          onClick={() => setTab('forward')}
        >
          Compound Interest (Annual)
        </button>
        <button
          className={tab === 'reverse' ? 'active' : ''}
          onClick={() => setTab('reverse')}
        >
          Reverse (Target Avg Real → Principal)
        </button>
      </div>
      {tab === 'forward' ? (
        <ForwardCalculator currency={currency} onCurrencyChange={setCurrency} />
      ) : (
        <ReverseCalculator currency={currency} />
      )}
    </main>
  );
}
