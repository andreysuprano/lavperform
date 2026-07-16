import { Heading } from '@chakra-ui/react'
import { useMemo } from 'react'
import {
  LuUserRoundCheck,
  LuUserRoundMinus,
  LuUserRoundPlus,
  LuUsers,
} from 'react-icons/lu'
import { RiDashboardLine } from 'react-icons/ri'

import {
  AppContentLayout,
  CustomerSummaryWidget,
  DashboardPerformanceSection,
  DashboardWelcome,
  GridLayout,
  IncentivizedSalesCard,
  MetricCard,
} from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useDashboardCustomers, useIncentivizedSales } from '@/hooks/queries'
import { SkeletonLoading } from './skeletonLoading'

const INCENTIVIZED_THRESHOLD = 1000

export function Home() {
  const { selectedCompany } = useAuth()

  const { data: customers, isLoading } = useDashboardCustomers(
    selectedCompany?.id
  )

  const { data: incentivizedData, isLoading: isLoadingIncentivized } =
    useIncentivizedSales(selectedCompany?.id, {})

  const showIncentivizedCard =
    !isLoadingIncentivized &&
    (incentivizedData?.totalValue ?? 0) > INCENTIVIZED_THRESHOLD

  const firstSectionCards = useMemo(() => {
    return [
      {
        icon: LuUsers,
        label: 'Total',
        value: customers?.totalCustomers ?? 0,
      },
      {
        icon: LuUserRoundCheck,
        label: 'Ativos',
        value: customers?.activeCustomers ?? 0,
      },
      {
        icon: LuUserRoundMinus,
        label: 'Reconquista',
        value: customers?.inactiveCustomers ?? 0,
      },
      {
        icon: LuUserRoundPlus,
        label: 'Novos',
        value: customers?.newCustomers ?? 0,
      },
    ]
  }, [customers])

  if (isLoading) {
    return <SkeletonLoading />
  }

  return (
    <AppContentLayout
      icon={<RiDashboardLine />}
      title="Dashboard"
    >
      {showIncentivizedCard && <IncentivizedSalesCard />}
      <DashboardWelcome />
      <Heading
        fontWeight="bold"
        size="2xl"
      >
        Sua base
      </Heading>
      <GridLayout
        columns={{ base: 1, md: 2, xl: 4 }}
        items={firstSectionCards}
        renderItem={(card, idx) => (
          <MetricCard
            key={idx}
            {...card}
          />
        )}
      />
      <CustomerSummaryWidget />
      <Heading
        fontWeight="bold"
        size="2xl"
      >
        Performance
      </Heading>
      <DashboardPerformanceSection companyId={selectedCompany?.id} />
    </AppContentLayout>
  )
}
