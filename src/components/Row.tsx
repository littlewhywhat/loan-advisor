import { Badge, Flex, Text } from '@radix-ui/themes';

type RowProps = {
  label: string;
  value: string;
  color?: 'green' | 'red' | 'gray';
  weight?: 'bold' | 'medium';
  indent?: boolean;
  strikethrough?: boolean;
  badge?: string;
};

export default function Row({
  label,
  value,
  color,
  weight = 'bold',
  indent,
  strikethrough,
  badge,
}: RowProps) {
  const style = strikethrough
    ? { textDecoration: 'line-through' as const, opacity: 0.5 }
    : undefined;

  return (
    <Flex justify="between" align="center" pl={indent ? '4' : '0'}>
      <Flex align="center" gap="2">
        <Text size="2" color={indent ? 'gray' : undefined} style={style}>
          {label}
        </Text>
        {badge && (
          <Badge size="1" variant="soft" color="purple">
            {badge}
          </Badge>
        )}
      </Flex>
      <Text size="2" weight={weight} color={color} style={style}>
        {value}
      </Text>
    </Flex>
  );
}
