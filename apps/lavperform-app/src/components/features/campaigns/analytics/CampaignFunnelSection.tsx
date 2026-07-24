import { Box, Flex, Heading, Stack, Text } from '@chakra-ui/react'
import { LuChevronRight } from 'react-icons/lu'

import { useWhiteLabel } from '@/config'
import { formatPercentRate } from '@/utils/campaigns/campaignMetrics'

type Props = {
  messagesSent: number
  interactions: number
  salesTotalQuantity: number
  ctr: number
  clickToSaleRate: number
}

function FunnelStage({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: string
}) {
  return (
    <Flex
      align="center"
      bg="bg"
      borderColor="border"
      borderRadius="md"
      borderWidth="1px"
      flex="1"
      gap={3}
      minW={0}
      px={3}
      py={2.5}
    >
      <Box
        bg={accent}
        borderRadius="full"
        flexShrink={0}
        h="10px"
        w="10px"
      />
      <Stack
        gap={0}
        minW={0}
      >
        <Text
          color="fg.muted"
          fontSize="xs"
          fontWeight="medium"
        >
          {label}
        </Text>
        <Text
          color="fg"
          fontSize="lg"
          fontWeight="bold"
          letterSpacing="tight"
          lineHeight="short"
        >
          {value.toLocaleString('pt-BR')}
        </Text>
      </Stack>
    </Flex>
  )
}

function RateBadge({ label, value }: { label: string; value: number }) {
  return (
    <Flex
      align="center"
      color="fg.muted"
      direction={{ base: 'row', md: 'column' }}
      flexShrink={0}
      gap={{ base: 2, md: 0.5 }}
      justify="center"
      px={{ base: 0, md: 1 }}
      py={{ base: 1, md: 0 }}
    >
      <LuChevronRight size={14} />
      <Stack
        align={{ base: 'flex-start', md: 'center' }}
        gap={0}
      >
        <Text
          fontSize="2xs"
          fontWeight="medium"
          whiteSpace="nowrap"
        >
          {label}
        </Text>
        <Text
          color="fg"
          fontSize="sm"
          fontWeight="bold"
          whiteSpace="nowrap"
        >
          {formatPercentRate(value)}
        </Text>
      </Stack>
    </Flex>
  )
}

export function CampaignFunnelSection({
  messagesSent,
  interactions,
  salesTotalQuantity,
  ctr,
  clickToSaleRate,
}: Props) {
  const { colorPalette } = useWhiteLabel()
  const hasActivity =
    messagesSent > 0 || interactions > 0 || salesTotalQuantity > 0

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
      <Stack gap={3}>
        <Stack gap={0.5}>
          <Heading
            color="fg"
            fontSize="md"
            fontWeight="semibold"
            letterSpacing="tight"
          >
            Funil de conversão
          </Heading>
          <Text
            color="fg.muted"
            fontSize="sm"
          >
            Envios → cliques → vendas no período
          </Text>
        </Stack>

        {!hasActivity ? (
          <Text
            color="fg.muted"
            fontSize="sm"
            py={2}
          >
            Sem dados de funil neste período.
          </Text>
        ) : (
          <Flex
            align={{ base: 'stretch', md: 'center' }}
            direction={{ base: 'column', md: 'row' }}
            gap={{ base: 2, md: 2 }}
          >
            <FunnelStage
              accent={`${colorPalette}.solid`}
              label="Envios"
              value={messagesSent}
            />
            <RateBadge
              label="CTR"
              value={ctr}
            />
            <FunnelStage
              accent="orange.solid"
              label="Cliques"
              value={interactions}
            />
            <RateBadge
              label="Clique → venda"
              value={clickToSaleRate}
            />
            <FunnelStage
              accent="green.solid"
              label="Vendas"
              value={salesTotalQuantity}
            />
          </Flex>
        )}
      </Stack>
    </Box>
  )
}
