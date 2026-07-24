import { SimpleGrid } from '@chakra-ui/react'
import {
  LuGift,
  LuHeartHandshake,
  LuRefreshCw,
  LuShieldAlert,
  LuSparkles,
} from 'react-icons/lu'

import { MetricCard } from '@/components/features/dashboard/MetricCard/MetricCard'
import type { CustomerInsightsOpportunities } from '@/types'

type Props = {
  opportunities: CustomerInsightsOpportunities
}

export function CustomerOpportunityCards({ opportunities }: Props) {
  return (
    <SimpleGrid
      columns={{ base: 2, md: 3, xl: 5 }}
      gap={3}
    >
      <MetricCard
        icon={LuShieldAlert}
        label="Retenção"
        size="sm"
        value={opportunities.retention}
      />
      <MetricCard
        icon={LuRefreshCw}
        label="Reconquista"
        size="sm"
        value={opportunities.reconquest}
      />
      <MetricCard
        icon={LuHeartHandshake}
        label="Fidelizados"
        size="sm"
        value={opportunities.loyalty}
      />
      <MetricCard
        icon={LuSparkles}
        label="Nutrição"
        size="sm"
        value={opportunities.nurture}
      />
      <MetricCard
        icon={LuGift}
        label="Aniversários (30d)"
        size="sm"
        value={opportunities.upcomingBirthdays}
      />
    </SimpleGrid>
  )
}
