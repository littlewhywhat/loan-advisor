import { Badge, Flex, Link } from '@radix-ui/themes';
import Hello from '@/components/Hello';

export default function HomePage() {
  const env = import.meta.env.VITE_ENV ?? 'preview';
  return (
    <Flex
      direction="column"
      minHeight="100vh"
      align="center"
      justify="center"
      gap="4"
      p="6"
    >
      <Hello />
      <Link href="/api/health">API Health</Link>
      <Badge>ENV: {env}</Badge>
    </Flex>
  );
}
