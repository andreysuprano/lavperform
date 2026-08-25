import { Heading, Stack, Text } from '@chakra-ui/react'
import { RiDashboardLine } from 'react-icons/ri'

import {
  AppContentLayout,
  CustomerSummaryWidget,
  DashboardHeroBanner,
  DashboardOpsMetrics,
  DashboardQuickLinks,
  DashboardTodaySales,
  DashboardTopCustomersRank,
} from '@/components'

export function Home() {
  return (
    <AppContentLayout
      icon={<RiDashboardLine />}
      title="Início"
    >
      <Stack gap={8}>
        <DashboardHeroBanner />

        <Stack gap={3}>
          <Stack gap={0.5}>
            <Heading
              fontWeight="semibold"
              size="md"
            >
              Resumo do dia
            </Heading>
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              Números que importam agora na operação.
            </Text>
          </Stack>
          <DashboardOpsMetrics />
          <Stack gap={2}>
            <Text
              color="fg.muted"
              fontSize="xs"
              fontWeight="medium"
              letterSpacing="0.04em"
              textTransform="uppercase"
            >
              Segmentação RFV
            </Text>
            <CustomerSummaryWidget />
          </Stack>
        </Stack>

        <DashboardQuickLinks />

        <DashboardTopCustomersRank />

        <DashboardTodaySales />
      </Stack>
    </AppContentLayout>
  )
}
