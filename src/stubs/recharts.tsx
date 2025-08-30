/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import type { ReactNode } from 'react';

export function ResponsiveContainer({ children }: { width?: string | number; height?: string | number; children?: ReactNode }) {
  return <div style={{ width: '100%', height: '100%' }}>{children}</div>;
}

export function ComposedChart({ children }: { data?: unknown; children?: ReactNode }) {
  return <div>{children}</div>;
}

export function Bar(_props: Record<string, unknown>) { return null; }
export function Line(_props: Record<string, unknown>) { return null; }
export function XAxis(_props: Record<string, unknown>) { return null; }
export function YAxis(_props: Record<string, unknown>) { return null; }
export function Legend(_props: Record<string, unknown>) { return null; }
export function Tooltip(_props: Record<string, unknown>) { return null; }
export function CartesianGrid(_props: Record<string, unknown>) { return null; }
