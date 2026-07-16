import { Card, Flex, Text } from '@chakra-ui/react'
import { memo } from 'react'

import { formatFullDate } from '@/utils/date'
import { formatCurrency } from '@/utils/money'

import { Props } from './RecentSaleCard.types'

function RecentSaleCardBase({ sale }: Props) {
  return (
    <Card.Root
      borderColor="border.muted"
      borderWidth="1px"
      size="sm"
      shadow="xs"
    >
      <Card.Body
        gap={1}
        px={3}
        py={4}
      >
        <Flex
          align="center"
          gap={2}
          justify="space-between"
        >
          <Flex
            align="center"
            flex={1}
            gap={2}
            minW={0}
          >
            <Text
              flexShrink={0}
              fontSize="sm"
              fontWeight="semibold"
              lineClamp={1}
            >
              {sale.customerName}
            </Text>
            <Text
              color="fg.muted"
              flex={1}
              fontSize="xs"
              lineClamp={1}
              minW={0}
            >
              {sale.productsLabel}
            </Text>
          </Flex>
          <Flex
            align="center"
            flexShrink={0}
            gap={2}
          >
            <Text
              fontSize="sm"
              fontWeight="bold"
              whiteSpace="nowrap"
            >
              {formatCurrency(sale.saleAmount)}
            </Text>
            <Text
              color="fg.muted"
              fontSize="xs"
              whiteSpace="nowrap"
            >
              {formatFullDate(sale.saleDate)}
            </Text>
          </Flex>
        </Flex>
      </Card.Body>
    </Card.Root>
  )
}

const RecentSaleCard = memo(RecentSaleCardBase) as typeof RecentSaleCardBase

export { RecentSaleCard, type Props as RecentSaleCardProps }
