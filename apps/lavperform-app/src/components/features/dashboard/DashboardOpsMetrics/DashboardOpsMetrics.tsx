import { SimpleGrid, Skeleton } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import {
  LuCircleDollarSign,
  LuRefreshCw,
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
import { isSelfServiceModel } from '@/utils/dashboard/rankingDisplay'

import { MetricCard } from '../MetricCard/MetricCard'

function DashboardOpsMetricsBase() {
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id

  const { data: customers, isLoading: isLoadingCustomers } =
    useDashboardCustomers(companyId)

  const {
    data: performance,
    isLoading: isLoadingPerformance,
    isPlaceholderData: isPlaceholderPerformance,
  } = useDashboardPerformance(companyId)

  const isLoading =
    isLoadingCustomers || isLoadingPerformance || isPlaceholderPerformance

  const showCycles = isSelfServiceModel(selectedCompany?.serviceModel)

  const cards = useMemo(
    () => {
      const items = [
      {
        id: 'daily-sales-amount',
        icon: LuCircleDollarSign,
        label: 'Vendas do dia',
        value: performance?.summary.dailySalesAmount ?? 0,
        valueType: 'currency-full' as const,
      },
      {
        id: 'daily-sales-count',
        icon: LuShoppingCart,
        label: 'Vendas do dia',
        value: performance?.summary.dailySalesCount ?? 0,
        valueType: 'number' as const,
      },
      ...(showCycles
        ? [
            {
              id: 'daily-cycle-count',
              icon: LuRefreshCw,
              label: 'Ciclos do dia',
              value: performance?.summary.dailyCycleCount ?? 0,
              valueType: 'number' as const,
            },
          ]
        : []),
      {
        id: 'active-customers',
        icon: LuUserRoundCheck,
        label: 'Clientes ativos',
        value: customers?.activeCustomers ?? 0,
        valueType: 'number' as const,
      },
      {
        id: 'reconquest-customers',
        icon: LuUserRoundMinus,
        label: 'Reconquista',
        value: customers?.inactiveCustomers ?? 0,
        valueType: 'number' as const,
      },
      {
        id: 'new-customers',
        icon: LuUserRoundPlus,
        label: 'Novos',
        value: customers?.newCustomers ?? 0,
        valueType: 'number' as const,
      },
    ]
      return items
    },
    [customers, performance, showCycles]
  )

  const columns = showCycles
    ? { base: 1, sm: 2, md: 3, xl: 6 }
    : { base: 1, sm: 2, md: 3, xl: 5 }

  if (isLoading) {
    return (
      <SimpleGrid
        columns={columns}
        gap={4}
        w="full"
      >
        {Array.from({ length: cards.length }).map((_, idx) => (
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
      columns={columns}
      gap={4}
      w="full"
    >
      {cards.map(({ id, ...card }) => (
        <MetricCard
          key={id}
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
