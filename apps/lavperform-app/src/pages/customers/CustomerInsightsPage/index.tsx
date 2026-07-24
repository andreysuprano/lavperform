import { Alert, Spinner, Stack, Text } from '@chakra-ui/react'
import { useMemo } from 'react'
import { LuBrain } from 'react-icons/lu'

import {
  AppContentLayout,
  CustomerCampaignReadinessCards,
  CustomerCrmInsightsList,
  CustomerMetricsSection,
  CustomerOpportunityCards,
  CustomerSegmentBreakdown,
} from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useDashboardCustomersInsights } from '@/hooks/queries'
import { getCustomerCrmInsights } from '@/utils/customers/customerCrmInsights'

export function CustomerInsightsPage() {
  const { selectedCompany } = useAuth()
  const { data, isLoading, isError, error } = useDashboardCustomersInsights(
    selectedCompany?.id,
  )

  const insights = useMemo(
    () => (data ? getCustomerCrmInsights(data) : []),
    [data],
  )

  return (
    <AppContentLayout
      icon={<LuBrain />}
      title="Insights de clientes"
    >
      <Stack gap={5}>
        <CustomerMetricsSection />

        {isLoading && (
          <Stack
            align="center"
            gap={3}
            py={10}
          >
            <Spinner size="lg" />
            <Text color="fg.muted">Carregando inteligência da base...</Text>
          </Stack>
        )}

        {isError && (
          <Alert.Root
            borderRadius="lg"
            status="error"
          >
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Erro ao carregar insights</Alert.Title>
              <Alert.Description>
                {(error as { response?: { data?: { message?: string } } })
                  ?.response?.data?.message ??
                  'Não foi possível carregar os insights da base.'}
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {data && (
          <>
            <CustomerCampaignReadinessCards
              readiness={data.campaignReadiness}
            />

            <Stack gap={2}>
              <Text
                color="fg.muted"
                fontSize="xs"
                fontWeight="medium"
                letterSpacing="0.08em"
                textTransform="uppercase"
              >
                Oportunidades de ação
              </Text>
              <CustomerOpportunityCards opportunities={data.opportunities} />
            </Stack>

            <CustomerSegmentBreakdown
              segments={data.segments}
              totalCustomers={data.summary.totalCustomers}
            />

            <CustomerCrmInsightsList insights={insights} />
          </>
        )}
      </Stack>
    </AppContentLayout>
  )
}
