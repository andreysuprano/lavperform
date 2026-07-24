import { SimpleGrid, Stack } from '@chakra-ui/react'
import { memo } from 'react'

import { useDashboardPerformance } from '@/hooks/queries'

import { Props } from './DashboardPerformanceSection.types'
import { PerformanceMetricsPanel } from './PerformanceMetricsPanel'
import { RecentSalesPanel } from './RecentSalesPanel'

function DashboardPerformanceSectionBase({
  companyId,
  showDailyCards = true,
}: Props) {
  const {
    data: performance,
    isError,
    isLoading,
  } = useDashboardPerformance(companyId)

  if (!companyId) {
    return null
  }

  return (
    <SimpleGrid
      alignItems="stretch"
      columns={{ base: 1, xl: 2 }}
      gap={6}
      w="full"
    >
      <Stack h="full">
        <PerformanceMetricsPanel
          isError={isError}
          isLoading={isLoading}
          performance={performance}
          showDailyCards={showDailyCards}
        />
      </Stack>
      <Stack h="full">
        <RecentSalesPanel companyId={companyId} />
      </Stack>
    </SimpleGrid>
  )
}

const DashboardPerformanceSection = memo(
  DashboardPerformanceSectionBase
) as typeof DashboardPerformanceSectionBase

export {
  DashboardPerformanceSection,
  type Props as DashboardPerformanceSectionProps,
}
