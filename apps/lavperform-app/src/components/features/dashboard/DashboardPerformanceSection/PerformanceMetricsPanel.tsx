import { SimpleGrid, Skeleton, Stack } from '@chakra-ui/react'
import { memo } from 'react'
import { LuCircleDollarSign, LuShoppingCart } from 'react-icons/lu'

import { Empty } from '@/components/common'

import { MetricCard } from '../MetricCard/MetricCard'
import { PerformanceChart } from './PerformanceChart'
import { Props } from './PerformanceMetricsPanel.types'

function PerformanceMetricsSkeleton({
  showDailyCards,
}: {
  showDailyCards: boolean
}) {
  return (
    <Stack gap={4}>
      {showDailyCards ? (
        <SimpleGrid
          columns={{ base: 1, md: 2 }}
          gap={4}
        >
          <Skeleton height="96px" />
          <Skeleton height="96px" />
        </SimpleGrid>
      ) : null}
      <Skeleton
        borderRadius="xl"
        height="380px"
      />
    </Stack>
  )
}

function PerformanceMetricsPanelBase({
  isError = false,
  isLoading = false,
  performance,
  showDailyCards = true,
}: Props) {
  if (isLoading) {
    return <PerformanceMetricsSkeleton showDailyCards={showDailyCards} />
  }

  if (isError) {
    return (
      <Empty
        description="Não foi possível carregar os indicadores de performance."
        title="Erro ao carregar indicadores"
      />
    )
  }

  if (!performance) {
    return null
  }

  const cards = [
    {
      icon: LuCircleDollarSign,
      label: 'Valor Vendas do Dia',
      value: performance.summary.dailySalesAmount,
      valueType: 'currency-full' as const,
    },
    {
      icon: LuShoppingCart,
      label: 'Vendas do Dia',
      value: performance.summary.dailySalesCount,
      valueType: 'number' as const,
    },
  ]

  return (
    <Stack
      gap={4}
      h="full"
    >
      {showDailyCards ? (
        <SimpleGrid
          columns={{ base: 1, md: 2 }}
          gap={4}
        >
          {cards.map((card) => (
            <MetricCard
              key={card.label}
              {...card}
              size="sm"
            />
          ))}
        </SimpleGrid>
      ) : null}

      <PerformanceChart data={performance.chartData} />
    </Stack>
  )
}

const PerformanceMetricsPanel = memo(
  PerformanceMetricsPanelBase
) as typeof PerformanceMetricsPanelBase

export { PerformanceMetricsPanel, type Props as PerformanceMetricsPanelProps }
