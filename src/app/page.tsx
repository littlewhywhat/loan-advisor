'use client';

import { useState } from 'react';
import { Tabs } from '@radix-ui/themes';
import ForwardCalculator from '@/components/ForwardCalculator';
import ReverseCalculator from '@/components/ReverseCalculator';
import LoanVsInvesting from '@/components/LoanVsInvesting';

type TabKey = 'forward' | 'reverse' | 'loan';

export default function Home() {
  const [tab, setTab] = useState<TabKey>('forward');

  return (
    <main style={{ padding: '1rem', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h1>Real Compound Interest Calculator</h1>
        <p title="inflation-adjusted = today's purchasing power">
          Calculate nominal and inflation-adjusted growth
        </p>
      </header>
      <Tabs.Root value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <Tabs.List className="tab-list">
          <Tabs.Trigger value="forward">Compound Interest (Annual)</Tabs.Trigger>
          <Tabs.Trigger value="reverse">Reverse (Target Avg Real → Principal)</Tabs.Trigger>
          <Tabs.Trigger value="loan">Loan vs Investing</Tabs.Trigger>
        </Tabs.List>
        <select
          className="tab-select"
          value={tab}
          onChange={(e) => setTab(e.target.value as TabKey)}
        >
          <option value="forward">Compound Interest (Annual)</option>
          <option value="reverse">Reverse (Target Avg Real → Principal)</option>
          <option value="loan">Loan vs Investing</option>
        </select>
        <Tabs.Content value="forward">
          <ForwardCalculator />
        </Tabs.Content>
        <Tabs.Content value="reverse">
          <ReverseCalculator />
        </Tabs.Content>
        <Tabs.Content value="loan">
          <LoanVsInvesting />
        </Tabs.Content>
      </Tabs.Root>
    </main>
  );
}
