import { SimpleGrid, Skeleton } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import {
  LuCircleDollarSign,
  LuShoppingCart,
  LuUserRoundCheck,
  LuUserRoundMinus,
  LuUserRoundPlus,
} from 'react-icons/lu'

import { useAuth } from '@/context/AuthContext'
import {
  useDashboardCustomers,
  useDashboardPerformance,
} from '@/hooks/queries'

import { MetricCard } from '../MetricCard/MetricCard'

function DashboardOpsMetricsBase() {
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id

  const { data: customers, isLoading: isLoadingCustomers } =
    useDashboardCustomers(companyId)

  const { data: performance, isLoading: isLoadingPerformance } =
    useDashboardPerformance(companyId)

  const isLoading = isLoadingCustomers || isLoadingPerformance

  const cards = useMemo(
    () => [
      {
        icon: LuCircleDollarSign,
        label: 'Vendas do dia',
        value: performance?.summary.dailySalesAmount ?? 0,
        valueType: 'currency-full' as const,
      },
      {
        icon: LuShoppingCart,
        label: 'Vendas do dia',
        value: performance?.summary.dailySalesCount ?? 0,
        valueType: 'number' as const,
      },
      {
        icon: LuUserRoundCheck,
        label: 'Clientes ativos',
        value: customers?.activeCustomers ?? 0,
        valueType: 'number' as const,
      },
      {
        icon: LuUserRoundMinus,
        label: 'Reconquista',
        value: customers?.inactiveCustomers ?? 0,
        valueType: 'number' as const,
      },
      {
        icon: LuUserRoundPlus,
        label: 'Novos',
        value: customers?.newCustomers ?? 0,
        valueType: 'number' as const,
      },
    ],
    [customers, performance]
  )

  if (isLoading) {
    return (
      <SimpleGrid
        columns={{ base: 1, sm: 2, md: 3, xl: 5 }}
        gap={4}
        w="full"
      >
        {Array.from({ length: 5 }).map((_, idx) => (
          <Skeleton
            height="96px"
            key={idx}
          />
        ))}
      </SimpleGrid>
    )
  }

  return (
    <SimpleGrid
      columns={{ base: 1, sm: 2, md: 3, xl: 5 }}
      gap={4}
      w="full"
    >
      {cards.map((card) => (
        <MetricCard
          key={card.label}
          {...card}
          size="sm"
        />
      ))}
    </SimpleGrid>
  )
}

const DashboardOpsMetrics = memo(
  DashboardOpsMetricsBase
) as typeof DashboardOpsMetricsBase

export { DashboardOpsMetrics }
