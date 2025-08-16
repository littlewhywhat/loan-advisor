import Hello from '@/components/Hello';
import { Badge, Flex, Link } from '@radix-ui/themes';

export default function Home() {
  const env = process.env.NEXT_PUBLIC_ENV ?? 'preview';
  return (
    <Flex direction="column" minHeight="100vh" align="center" justify="center" gap="4" p="6">
      <Hello />
      <Link href="/api/health">API Health</Link>
      <Badge>ENV: {env}</Badge>
    </Flex>
  );
}
