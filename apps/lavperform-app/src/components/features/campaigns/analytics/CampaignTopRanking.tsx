import {
  Box,
  Button,
  Flex,
  Heading,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'

import type { DashTopCampaign } from '@/types'
import {
  formatPercentRate,
  formatRoi,
} from '@/utils/campaigns/campaignMetrics'
import { formatCurrency } from '@/utils/money'

type Props = {
  campaigns: DashTopCampaign[]
}

export function CampaignTopRanking({ campaigns }: Props) {
  return (
    <Box
      bg="bg.panel"
      borderColor="border"
      borderRadius="lg"
      borderWidth="1px"
      overflow="hidden"
      shadow="xs"
      w="full"
    >
      <Stack
        gap={3}
        p={{ base: 4, md: 5 }}
        pb={campaigns.length === 0 ? 5 : 2}
      >
        <Flex
          align={{ base: 'stretch', sm: 'center' }}
          direction={{ base: 'column', sm: 'row' }}
          gap={2}
          justify="space-between"
        >
          <Stack gap={0.5}>
            <Heading
              fontSize="md"
              fontWeight="semibold"
              letterSpacing="tight"
            >
              O que está funcionando
            </Heading>
            <Text
              color="fg.muted"
              fontSize="xs"
            >
              Top campanhas por receita incentivada no período
            </Text>
          </Stack>
          <Button
            asChild
            size="xs"
            variant="outline"
          >
            <RouterLink to="/campaigns/recurring-campaigns">
              Ver todas
            </RouterLink>
          </Button>
        </Flex>

        {campaigns.length === 0 ? (
          <Text
            color="fg.muted"
            fontSize="sm"
            py={2}
          >
            Nenhuma campanha com envios neste período.
          </Text>
        ) : (
          <Box
            mx={{ base: -4, md: -5 }}
            overflowX="auto"
          >
            <Table.Root
              size="sm"
              stickyHeader
            >
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader pl={{ base: 4, md: 5 }}>
                    Campanha
                  </Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">Receita</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">ROI</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">CTR</Table.ColumnHeader>
                  <Table.ColumnHeader
                    pr={{ base: 4, md: 5 }}
                    textAlign="end"
                  >
                    Conversão
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {campaigns.map((campaign) => (
                  <Table.Row key={campaign.id}>
                    <Table.Cell
                      fontWeight="medium"
                      maxW="220px"
                      pl={{ base: 4, md: 5 }}
                    >
                      <Text lineClamp={1}>{campaign.name}</Text>
                      <Text
                        color="fg.muted"
                        fontSize="2xs"
                      >
                        {campaign.messagesSent.toLocaleString('pt-BR')} envios ·{' '}
                        {campaign.salesTotalQuantity.toLocaleString('pt-BR')}{' '}
                        vendas
                      </Text>
                    </Table.Cell>
                    <Table.Cell textAlign="end">
                      {formatCurrency(campaign.salesTotalAmount)}
                    </Table.Cell>
                    <Table.Cell textAlign="end">
                      {formatRoi(campaign.roi)}
                    </Table.Cell>
                    <Table.Cell textAlign="end">
                      {formatPercentRate(campaign.ctr)}
                    </Table.Cell>
                    <Table.Cell
                      pr={{ base: 4, md: 5 }}
                      textAlign="end"
                    >
                      {formatPercentRate(campaign.conversionRate)}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        )}
      </Stack>
    </Box>
  )
}
