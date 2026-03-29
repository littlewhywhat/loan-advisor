import { Badge, Card, Flex, Heading, Text } from '@radix-ui/themes';
import { useEvents } from '@/context/EventProvider';
import { findOwnerEvent } from '@/lib/eventUtils';
import { fmtMoney, formatPct } from '@/lib/format';
import type { Asset } from '@/types/events';

const KIND_LABELS: Record<Asset['kind'], string> = {
  flat: 'Flat',
  cash: 'Cash',
};

const KIND_COLORS: Record<Asset['kind'], 'blue' | 'green'> = {
  flat: 'blue',
  cash: 'green',
};

export default function AssetsPage() {
  const { events, derived } = useEvents();

  return (
    <Flex direction="column" gap="5" style={{ maxWidth: 720 }}>
      <Heading size="7">Assets</Heading>

      {derived.assets.length === 0 && (
        <Card>
          <Text size="3" color="gray" align="center">
            No assets yet. Assets are created when you take a mortgage or
            personal loan on the Liabilities page.
          </Text>
        </Card>
      )}

      {derived.assets.map((asset) => {
        const owner = findOwnerEvent(events, asset.id);
        return (
          <Card key={asset.id}>
            <Flex direction="column" gap="2">
              <Flex justify="between" align="center">
                <Flex align="center" gap="2">
                  <Text size="3" weight="bold">
                    {asset.name}
                  </Text>
                  <Badge color={KIND_COLORS[asset.kind]} size="1">
                    {KIND_LABELS[asset.kind]}
                  </Badge>
                  {owner && (
                    <Badge size="1" variant="soft" color="gray">
                      from {owner.type.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </Flex>
              </Flex>

              <Flex gap="5" wrap="wrap">
                <Flex direction="column">
                  <Text size="1" color="gray">
                    Value
                  </Text>
                  <Text size="2" weight="bold">
                    {fmtMoney(asset.value)}
                  </Text>
                </Flex>
                {asset.growthRate !== 0 && (
                  <Flex direction="column">
                    <Text size="1" color="gray">
                      Growth Rate
                    </Text>
                    <Text size="2" weight="bold">
                      {formatPct(asset.growthRate)}/yr
                    </Text>
                  </Flex>
                )}
              </Flex>

              {owner?.type === 'take_mortgage' && (
                <Flex gap="3" wrap="wrap">
                  <Flex gap="1" align="center">
                    <Text size="1" color="gray">
                      Mortgage:
                    </Text>
                    <Badge size="1" variant="soft" color="red">
                      {owner.mortgage.name} {fmtMoney(owner.mortgage.value)}
                    </Badge>
                  </Flex>
                  <Flex gap="1" align="center">
                    <Text size="1" color="gray">
                      Payment:
                    </Text>
                    <Badge size="1" variant="soft" color="orange">
                      {fmtMoney(owner.expense.amount)}/mo
                    </Badge>
                  </Flex>
                  {owner.rental && (
                    <Flex gap="1" align="center">
                      <Text size="1" color="gray">
                        Rental income:
                      </Text>
                      <Badge size="1" variant="soft" color="green">
                        {fmtMoney(owner.income.amount)}/mo
                      </Badge>
                    </Flex>
                  )}
                </Flex>
              )}

              {owner?.type === 'take_personal_loan' && (
                <Flex gap="3" wrap="wrap">
                  <Flex gap="1" align="center">
                    <Text size="1" color="gray">
                      Loan:
                    </Text>
                    <Badge size="1" variant="soft" color="red">
                      {owner.loan.name} {fmtMoney(owner.loan.value)}
                    </Badge>
                  </Flex>
                  <Flex gap="1" align="center">
                    <Text size="1" color="gray">
                      Payment:
                    </Text>
                    <Badge size="1" variant="soft" color="orange">
                      {fmtMoney(owner.expense.amount)}/mo
                    </Badge>
                  </Flex>
                </Flex>
              )}
            </Flex>
          </Card>
        );
      })}
    </Flex>
  );
}
