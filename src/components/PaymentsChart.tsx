import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { LoanBreakdown } from '@/lib/loanCalc';

type PaymentsChartProps = {
  data: LoanBreakdown[];
};

const PRINCIPAL_FILL = 'var(--green-9)';
const INTEREST_FILL = 'var(--red-9)';

export default function PaymentsChart({ data }: PaymentsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          domain={[0, 'auto']}
        />
        <Tooltip
          formatter={(value, name) => [
            `$${(value ?? 0).toLocaleString()}`,
            name ?? '',
          ]}
          contentStyle={{ borderRadius: 8 }}
        />
        <Legend />
        <Bar
          dataKey="principal"
          name="Principal"
          stackId="a"
          fill={PRINCIPAL_FILL}
          radius={[4, 0, 0, 0]}
        >
          <LabelList
            dataKey="principalPct"
            formatter={(v) => `${Number(v)}%`}
            position="center"
            fill="white"
          />
        </Bar>
        <Bar
          dataKey="interest"
          name="Interest"
          stackId="a"
          fill={INTEREST_FILL}
          radius={[0, 0, 0, 4]}
        >
          <LabelList
            dataKey="interestPct"
            formatter={(v) => `${Number(v)}%`}
            position="center"
            fill="white"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
