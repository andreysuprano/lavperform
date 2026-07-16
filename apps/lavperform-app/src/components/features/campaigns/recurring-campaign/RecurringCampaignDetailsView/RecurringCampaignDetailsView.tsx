import { useChart } from '@chakra-ui/charts'
import { Box, Center, Spinner, Stack, Tabs, Text, useTabs } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LuChartColumnBig, LuFileText, LuTriangleAlert } from 'react-icons/lu'

import {
  CustomDialog,
  dateRangeToParams,
  type DateRangeValue,
  Empty,
} from '@/components'
import { useWhiteLabel } from '@/config'
import { useAuth } from '@/context/AuthContext'
import { recurringCampaignService } from '@/services'
import type { RecurringCampaign } from '@/types'
import { logger } from '@/utils/logger'

import { CampaignDetailsTab } from './CampaignDetailsTab'
import { PerformanceTab } from './PerformanceTab'

/**
 * Retorna um range customizado baseado no período da campanha.
 * - `campaign.startDate` e `campaign.endDate` são ISO em UTC.
 * - `endDate` é "clampado" para hoje caso a campanha termine no futuro,
 *   já que o backend não aceita datas futuras.
 * - Fallback para o preset de 7 dias quando os campos não existirem ou
 *   o intervalo resultante for inválido.
 */
function initialRangeFromCampaign(
  start?: string | null,
  end?: string | null
): DateRangeValue {
  const s = start?.slice(0, 10)
  const e = end?.slice(0, 10)
  const isYMD = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)
  if (!isYMD(s) || !isYMD(e)) return { kind: 'preset', days: 7 }

  const now = new Date()
  const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const endClamped = e! > todayYMD ? todayYMD : e!
  if (s! > endClamped) return { kind: 'preset', days: 7 }
  return { kind: 'custom', startDate: s!, endDate: endClamped }
}

type Props = {
  data: RecurringCampaign
  onClose: () => void
}

const INITIAL_METRICS = {
  campaignMetric: {
    automaticCampaignId: '',
    campaignId: '',
    conversionRate: '',
    createdAt: '',
    id: '',
    interactions: 0,
    messagesDelivered: 0,
    messagesError: 0,
    messagesSent: 0,
    salesTotalAmount: '',
    salesTotalQuantity: 0,
    totalCustomers: 0,
    updatedAt: '',
  },
  messagesSentByDate: [
    {
      clicks: 0,
      day: '',
      messages: 0,
      sales: 0,
    },
  ],
}

function RecurringCampaignDetailsView({ data, onClose }: Props) {
  const { colorPalette, theme } = useWhiteLabel()
  const hasDelivery = theme.features.hasDelivery

  const { selectedCompany } = useAuth()

  const tabs = useTabs({ defaultValue: 'performance' })

  const [isOpen, setIsOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [dateRange, setDateRange] = useState<DateRangeValue>(() =>
    initialRangeFromCampaign(data.startDate, data.endDate)
  )
  const [campaign, setCampaign] = useState<RecurringCampaign | null>(null)
  const [campaignMetrics, setCampaignMetrics] = useState(INITIAL_METRICS)

  const fetchCampaign = useCallback(async () => {
    if (!selectedCompany?.id || !data?.id) return

    try {
      const response = await recurringCampaignService.getCampaign(
        data.id,
        selectedCompany.id
      )
      setCampaign(response.data)
      return response.data
    } catch (error) {
      logger.error('Erro ao buscar campanha:', error)
      throw error
    }
  }, [data?.id, selectedCompany?.id])

  const activeDaysStrings = useMemo(() => {
    const days = campaign?.daysOfWeek
    return Array.isArray(days) ? (days as string[]) : []
  }, [campaign])

  const fetchCampaignMetrics = useCallback(async () => {
    if (!selectedCompany?.id || !data?.id) return

    try {
      const response = await recurringCampaignService.getCampaignMetrics(
        data.id,
        selectedCompany.id,
        dateRangeToParams(dateRange)
      )
      setCampaignMetrics(response.data)
      return response.data
    } catch (error) {
      logger.error('Erro ao buscar metricas da campanha:', error)
      throw error
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setHasError(false)

    Promise.all([fetchCampaign(), fetchCampaignMetrics()])
      .then(() => {
        if (!cancelled) setIsLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setHasError(true)
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isLoading || hasError || !campaign) return

    fetchCampaignMetrics().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchCampaignMetrics])

  const chartData = useMemo(
    () => [...campaignMetrics.messagesSentByDate],
    [campaignMetrics.messagesSentByDate]
  )

  const chartSeries = useMemo<
    {
      name: 'messages' | 'clicks' | 'sales'
      label: string
      color: string
    }[]
  >(
    () => [
      {
        name: 'messages',
        label: 'Enviadas',
        color: `${colorPalette}.400`,
      },
      {
        name: 'clicks',
        label: 'Cliques',
        color: 'orange.400',
      },
      {
        name: 'sales',
        label: 'Vendas',
        color: 'red.400',
      },
    ],
    [colorPalette]
  )

  const chart = useChart({
    data: chartData,
    series: chartSeries,
  })

  const handleClose = useCallback(() => {
    onClose()
    setIsOpen(false)
  }, [onClose])

  const renderContent = () => {
    if (isLoading) {
      return (
        <Center
          h="100%"
          minH={0}
          w="100%"
        >
          <Stack
            align="center"
            gap={4}
          >
            <Spinner
              borderWidth="3px"
              color="colorPalette.solid"
              size="xl"
            />
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              Carregando dados da campanha...
            </Text>
          </Stack>
        </Center>
      )
    }

    if (hasError || !campaign) {
      return (
        <Center
          h="100%"
          minH={0}
          px={6}
          w="100%"
        >
          <Empty
            description="Não foi possível carregar os dados no momento."
            icon={LuTriangleAlert}
            title="Algo deu errado"
          />
        </Center>
      )
    }

    return (
      <Tabs.RootProvider
        display="flex"
        flexDirection="column"
        h="100%"
        maxW="full"
        minH={0}
        minW={0}
        value={tabs}
        w="full"
      >
        <Box
          bg="bg.panel"
          borderBottomWidth="1px"
          borderColor="border.muted"
          flexShrink={0}
          px={{ base: 3, md: 6 }}
        >
          <Tabs.List
            borderBottomWidth={0}
            gap={{ base: 2, md: 4 }}
          >
            <Tabs.Trigger
              fontSize="sm"
              fontWeight="medium"
              gap={2}
              py={3}
              value="performance"
            >
              <LuChartColumnBig size={16} />
              Performance
            </Tabs.Trigger>
            <Tabs.Trigger
              fontSize="sm"
              fontWeight="medium"
              gap={2}
              py={3}
              value="details"
            >
              <LuFileText size={16} />
              Detalhes da campanha
            </Tabs.Trigger>
          </Tabs.List>
        </Box>

        <Box
          flex={1}
          maxW="full"
          minH={0}
          minW={0}
          overflow="hidden"
          position="relative"
          w="full"
        >
          <Tabs.Content
            h="100%"
            maxW="full"
            minH={0}
            minW={0}
            overflow="hidden"
            p={0}
            value="performance"
            w="full"
          >
            <PerformanceTab
              campaignId={campaign.id}
              chart={chart}
              chartSeries={chartSeries}
              companyId={selectedCompany?.id}
              dateRange={dateRange}
              metrics={campaignMetrics}
              onDateRangeChange={setDateRange}
            />
          </Tabs.Content>

          <Tabs.Content
            h="100%"
            maxW="full"
            minH={0}
            minW={0}
            overflowY="auto"
            p={0}
            value="details"
            w="full"
          >
            <CampaignDetailsTab
              activeDaysStrings={activeDaysStrings}
              campaign={campaign}
              hasDelivery={hasDelivery}
            />
          </Tabs.Content>
        </Box>
      </Tabs.RootProvider>
    )
  }

  return (
    <CustomDialog
      content={renderContent()}
      contentMaxW="6xl"
      isOpen={isOpen}
      onExitComplete={handleClose}
      size="cover"
      title={`Campanha: ${data?.name ?? ''}`}
    />
  )
}

export { RecurringCampaignDetailsView }
