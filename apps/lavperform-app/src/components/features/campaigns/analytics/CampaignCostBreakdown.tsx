import { Box, Flex, Heading, Stack, Text } from '@chakra-ui/react'

import { useWhiteLabel } from '@/config'
import type { CampaignMessageTypeBreakdown } from '@/types'
import {
  formatMessageTypeLabel,
} from '@/utils/campaigns/campaignMetrics'
import { formatCurrency } from '@/utils/money'

type Props = {
  items: CampaignMessageTypeBreakdown[]
}

export function CampaignCostBreakdown({ items }: Props) {
  const { colors } = useWhiteLabel()

  if (items.length === 0) return null

  const totalCost = items.reduce((acc, item) => acc + Number(item.cost || 0), 0)
  const totalCount = items.reduce((acc, item) => acc + Number(item.count || 0), 0)
  const maxCost = Math.max(...items.map((item) => Number(item.cost || 0)), 1)

  return (
    <Box
      bg="bg.panel"
      borderColor="border"
      borderRadius="lg"
      borderWidth="1px"
      p={{ base: 4, md: 5 }}
      shadow="xs"
      w="full"
    >
      <Stack gap={4}>
        <Stack gap={0.5}>
          <Heading
            fontSize="md"
            fontWeight="semibold"
            letterSpacing="tight"
          >
            Investimento por tipo
          </Heading>
          <Text
            color="fg.muted"
            fontSize="xs"
          >
            {totalCount.toLocaleString('pt-BR')} envio(s) ·{' '}
            {formatCurrency(totalCost)} no período
          </Text>
        </Stack>

        <Stack gap={3}>
          {items.map((item, idx) => {
            const cost = Number(item.cost || 0)
            const share = totalCost > 0 ? (cost / totalCost) * 100 : 0
            const widthPercent = (cost / maxCost) * 100

            return (
              <Stack
                key={`${item.channel}-${item.category ?? 'none'}-${idx}`}
                gap={1}
              >
                <Flex
                  align="baseline"
                  gap={2}
                  justify="space-between"
                >
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    lineClamp={1}
                  >
                    {formatMessageTypeLabel(item.channel, item.category)}
                  </Text>
                  <Text
                    color="fg.muted"
                    fontSize="xs"
                    whiteSpace="nowrap"
                  >
                    {item.count} · {formatCurrency(cost)}
                    {totalCost > 0
                      ? ` · ${share.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`
                      : ''}
                  </Text>
                </Flex>
                <Box
                  bg="bg.muted"
                  borderRadius="md"
                  h="8px"
                  overflow="hidden"
                >
                  <Box
                    bg={colors.primary}
                    borderRadius="md"
                    h="full"
                    minW={cost > 0 ? '4px' : 0}
                    w={`${Math.max(widthPercent, cost > 0 ? 4 : 0)}%`}
                  />
                </Box>
              </Stack>
            )
          })}
        </Stack>
      </Stack>
    </Box>
  )
}
