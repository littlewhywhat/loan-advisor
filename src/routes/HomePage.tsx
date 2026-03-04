import { Badge, Flex, Heading, Link } from '@radix-ui/themes';
import Hello from '@/components/Hello';
import PaymentsChart from '@/components/PaymentsChart';
import { sampleLoanPayments } from '@/lib/loanCalc';

const chartData = sampleLoanPayments(200_000);

export default function HomePage() {
  const env = import.meta.env.VITE_ENV ?? 'preview';
  return (
    <Flex direction="column" minHeight="100vh" align="center" gap="6" p="6">
      <Hello />
      <Link href="/api/health">API Health</Link>
      <Badge>ENV: {env}</Badge>
      <Flex
        direction="column"
        align="center"
        gap="2"
        style={{ width: '100%', maxWidth: 600 }}
      >
        <Heading size="3">Total cost breakdown ($200k principal)</Heading>
        <PaymentsChart data={chartData} />
      </Flex>
    </Flex>
  );
}
