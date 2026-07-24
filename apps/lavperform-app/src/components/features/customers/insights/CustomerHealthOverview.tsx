import {
  Box,
  FormatNumber,
  Grid,
  Heading,
  HStack,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'

import type {
  CustomerInsightsHealth,
  CustomerInsightsPatterns,
  DashCustomersProps,
} from '@/types'
import { formatCurrency } from '@/utils/money'

type Props = {
  summary: DashCustomersProps
  health: CustomerInsightsHealth
  patterns: CustomerInsightsPatterns
}

function RateRow({ label, value }: { label: string; value: number }) {
  return (
    <HStack
      justify="space-between"
      w="full"
    >
      <Text
        color="fg.muted"
        fontSize="sm"
      >
        {label}
      </Text>
      <Text
        fontSize="sm"
        fontWeight="semibold"
      >
        {value}%
      </Text>
    </HStack>
  )
}

export function CustomerHealthOverview({ summary, health, patterns }: Props) {
  const topDay = patterns.topOrderDays[0]

  return (
    <Grid
      gap={4}
      templateColumns={{ base: '1fr', lg: '1.2fr 1fr 1fr' }}
    >
      <Box
        bg="bg.panel"
        borderColor="border"
        borderRadius="lg"
        borderWidth="1px"
        p={5}
      >
        <VStack
          align="stretch"
          gap={3}
        >
          <Text
            color="fg.muted"
            fontSize="xs"
            fontWeight="medium"
            letterSpacing="0.08em"
            textTransform="uppercase"
          >
            Base total
          </Text>
          <Heading
            fontSize={{ base: '3xl', md: '4xl' }}
            fontWeight="bold"
            letterSpacing="-0.02em"
            lineHeight={1}
          >
            <FormatNumber value={summary.totalCustomers} />
          </Heading>
          <Text
            color="fg.muted"
            fontSize="sm"
          >
            <Text
              as="span"
              color="fg"
              fontWeight="semibold"
            >
              <FormatNumber value={summary.activeCustomers} />
            </Text>{' '}
            ativos ·{' '}
            <Text
              as="span"
              color="fg"
              fontWeight="semibold"
            >
              <FormatNumber value={summary.inactiveCustomers} />
            </Text>{' '}
            inativos ·{' '}
            <Text
              as="span"
              color="fg"
              fontWeight="semibold"
            >
              <FormatNumber value={summary.newCustomers} />
            </Text>{' '}
            novos
          </Text>
        </VStack>
      </Box>

      <Box
        bg="bg.panel"
        borderColor="border"
        borderRadius="lg"
        borderWidth="1px"
        p={5}
      >
        <Stack gap={3}>
          <Text
            color="fg.muted"
            fontSize="xs"
            fontWeight="medium"
            letterSpacing="0.08em"
            textTransform="uppercase"
          >
            Saúde da base
          </Text>
          <RateRow
            label="Ativos"
            value={health.activeRate}
          />
          <RateRow
            label="Alcançáveis (WhatsApp)"
            value={health.reachabilityRate}
          />
          <RateRow
            label="Em retenção"
            value={health.retentionRate}
          />
          <RateRow
            label="Fidelizados"
            value={health.loyaltyRate}
          />
        </Stack>
      </Box>

      <Box
        bg="bg.panel"
        borderColor="border"
        borderRadius="lg"
        borderWidth="1px"
        p={5}
      >
        <Stack gap={3}>
          <Text
            color="fg.muted"
            fontSize="xs"
            fontWeight="medium"
            letterSpacing="0.08em"
            textTransform="uppercase"
          >
            Padrões
          </Text>
          <VStack
            align="stretch"
            gap={1}
          >
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              Ticket médio
            </Text>
            <Text
              fontSize="xl"
              fontWeight="semibold"
            >
              {patterns.averageTicket > 0
                ? formatCurrency(patterns.averageTicket)
                : '—'}
            </Text>
          </VStack>
          <VStack
            align="stretch"
            gap={1}
          >
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              Dia mais forte
            </Text>
            <Text
              fontSize="md"
              fontWeight="semibold"
              textTransform="capitalize"
            >
              {topDay ? `${topDay.day} (${topDay.count})` : '—'}
            </Text>
          </VStack>
        </Stack>
      </Box>
    </Grid>
  )
}
