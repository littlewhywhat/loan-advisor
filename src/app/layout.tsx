import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import './globals.css';

export const metadata: Metadata = {
  title: 'Real Compound Interest Calculator',
  description:
    'Compute nominal and inflation-adjusted compound interest and reverse calculate required principal.',
  icons: { icon: '/favicon.svg' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Theme>{children}</Theme>
      </body>
    </html>
  );
}
