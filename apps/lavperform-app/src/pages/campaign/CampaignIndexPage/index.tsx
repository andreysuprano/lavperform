import { Flex, Grid, SimpleGrid, Spinner, Stack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { GrCycle } from 'react-icons/gr'
import {
  LuCircleDollarSign,
  LuMousePointerClick,
  LuPercent,
  LuReceipt,
  LuSend,
  LuShoppingCart,
  LuTriangleAlert,
  LuTrendingUp,
  LuWallet,
} from 'react-icons/lu'
import { useSearchParams } from 'react-router-dom'

import {
  AppContentLayout,
  CampaignChart,
  CampaignCostBreakdown,
  CampaignFunnelSection,
  CampaignPageBanner,
  CampaignStrategyInsights,
  CampaignTopRanking,
  ChartMetricCard,
  DateRangeFilter,
  type DateRangeValue,
  isSameDateRange,
  MetricCard,
  parseDateRangeFromSearch,
  toaster,
} from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useDashboardCampaigns } from '@/hooks/queries'
import {
  formatPercentRate,
  getCampaignDerivedMetrics,
  getCampaignStrategyInsights,
} from '@/utils/campaigns/campaignMetrics'
import { formatCurrency } from '@/utils/money'

import { CampaignIndexSkeletonLoading } from './skeletonLoading'

export function CampaignIndexPage() {
  const { selectedCompany } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const dateRange = useMemo(
    () => parseDateRangeFromSearch(searchParams),
    [searchParams]
  )

  const {
    data: campaigns,
    isFetching,
    isLoading,
    error,
  } = useDashboardCampaigns(selectedCompany?.id, dateRange)

  const lastErrorRef = useRef<unknown>(null)
  useEffect(() => {
    if (!error || error === lastErrorRef.current) return
    lastErrorRef.current = error
    const anyErr = error as { response?: { data?: { message?: string } } }
    const message =
      anyErr?.response?.data?.message ??
      'Não foi possível carregar os dados das campanhas.'
    toaster.create({
      type: 'error',
      title: 'Erro ao buscar dados',
      description: message,
    })
  }, [error])

  const handleRangeChange = useCallback(
    (next: DateRangeValue) => {
      if (isSameDateRange(next, dateRange)) return
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev)
          sp.delete('dateFilter')
          sp.delete('startDate')
          sp.delete('endDate')
          if (next.kind === 'preset') {
            if (next.days !== 7) sp.set('dateFilter', String(next.days))
          } else {
            sp.set('startDate', next.startDate)
            sp.set('endDate', next.endDate)
          }
          return sp
        },
        { replace: true }
      )
    },
    [dateRange, setSearchParams]
  )

  const active = campaigns?.activeCampaigns
  const messagesSent = active?.messagesSent ?? 0
  const interactions = Number(active?.interactions ?? 0)
  const salesQty = active?.salesTotalQuantity ?? 0
  const salesAmount = Number(active?.salesTotalAmount ?? 0)
  const ctr = Number(active?.ctr ?? 0)
  const clickToSaleRate = Number(active?.clickToSaleRate ?? 0)
  const conversionRate = Number(active?.conversionRate ?? 0)
  const averageTicket = Number(active?.averageTicket ?? 0)
  const errorRate = Number(active?.errorRate ?? 0)
  const totalCost = Number(active?.totalCost ?? 0)
  const messageTypeBreakdown = active?.messageTypeBreakdown ?? []
  const topCampaigns = campaigns?.topCampaigns ?? []

  const derived = useMemo(
    () => getCampaignDerivedMetrics(totalCost, salesAmount, salesQty),
    [totalCost, salesAmount, salesQty]
  )

  const dailySeries = campaigns?.messagesSentByDate ?? []

  const revenueSpark = useMemo(
    () => dailySeries.map((d) => ({ value: Number(d.salesAmount) || 0 })),
    [dailySeries]
  )
  const clicksSpark = useMemo(
    () => dailySeries.map((d) => ({ value: Number(d.clicks) || 0 })),
    [dailySeries]
  )
  const salesSpark = useMemo(
    () => dailySeries.map((d) => ({ value: Number(d.sales) || 0 })),
    [dailySeries]
  )

  const insights = useMemo(
    () =>
      getCampaignStrategyInsights({
        messagesSent,
        interactions,
        salesTotalQuantity: salesQty,
        salesTotalAmount: salesAmount,
        ctr,
        clickToSaleRate,
        conversionRate,
        errorRate,
        roi: derived.roi,
        topCampaignName: topCampaigns[0]?.name,
        topCampaignMessagesSent: topCampaigns[0]?.messagesSent,
      }),
    [
      messagesSent,
      interactions,
      salesQty,
      salesAmount,
      ctr,
      clickToSaleRate,
      conversionRate,
      errorRate,
      derived.roi,
      topCampaigns,
    ]
  )

  if (isLoading) {
    return <CampaignIndexSkeletonLoading />
  }

  return (
    <AppContentLayout
      icon={<GrCycle />}
      title="Fidelização e Recorrência"
    >
      <Stack gap={5}>
        <CampaignPageBanner />

        <Flex
          align={{ base: 'stretch', md: 'center' }}
          direction={{ base: 'column', md: 'row' }}
          gap={2}
          justify="space-between"
        >
          <Text
            color="fg.muted"
            fontSize="sm"
          >
            Performance das campanhas no período
          </Text>
          <Flex
            align="center"
            gap={2}
            justify={{ base: 'space-between', md: 'flex-end' }}
          >
            <DateRangeFilter
              onChange={handleRangeChange}
              presets={[7, 14, 30]}
              size="sm"
              value={dateRange}
            />
            {isFetching && (
              <Spinner
                color="fg.muted"
                size="sm"
              />
            )}
          </Flex>
        </Flex>

        <SimpleGrid
          columns={{ base: 1, sm: 2, lg: 4 }}
          gap={3}
        >
          <ChartMetricCard
            data={revenueSpark}
            icon={LuCircleDollarSign}
            label="Receita incentivada"
            maxValue={Math.max(...revenueSpark.map((d) => d.value), 1)}
            showTrend={revenueSpark.length > 1}
            value={formatCurrency(salesAmount)}
          />
          <ChartMetricCard
            icon={LuTrendingUp}
            label="ROI"
            value={derived.roiLabel}
          />
          <ChartMetricCard
            data={clicksSpark}
            icon={LuMousePointerClick}
            label="CTR"
            maxValue={Math.max(messagesSent, 1)}
            showTrend={clicksSpark.length > 1}
            value={formatPercentRate(ctr)}
          />
          <ChartMetricCard
            data={salesSpark}
            icon={LuPercent}
            label="Taxa de conversão"
            maxValue={Math.max(messagesSent, 1)}
            showTrend={salesSpark.length > 1}
            value={formatPercentRate(conversionRate)}
          />
        </SimpleGrid>

        <SimpleGrid
          columns={{ base: 2, md: 3, lg: 4 }}
          gap={3}
        >
          <MetricCard
            icon={LuSend}
            label="Envios"
            size="sm"
            value={messagesSent}
          />
          <MetricCard
            icon={LuMousePointerClick}
            label="Cliques"
            size="sm"
            value={interactions}
          />
          <MetricCard
            icon={LuShoppingCart}
            label="Pedidos"
            size="sm"
            value={salesQty}
          />
          <MetricCard
            icon={LuReceipt}
            label="Ticket médio"
            size="sm"
            value={averageTicket}
            valueType="currency-full"
          />
          <MetricCard
            icon={LuWallet}
            label="Investimento"
            size="sm"
            value={totalCost}
            valueType="currency-full"
          />
          <MetricCard
            icon={LuReceipt}
            label="Custo por venda"
            size="sm"
            value={derived.costPerSaleLabel}
            valueType="text"
          />
          <MetricCard
            icon={LuTriangleAlert}
            label="Taxa de erro"
            size="sm"
            value={formatPercentRate(errorRate)}
            valueType="text"
          />
        </SimpleGrid>

        <CampaignFunnelSection
          clickToSaleRate={clickToSaleRate}
          ctr={ctr}
          interactions={interactions}
          messagesSent={messagesSent}
          salesTotalQuantity={salesQty}
        />

        <CampaignStrategyInsights insights={insights} />

        <CampaignChart
          campaigns={campaigns}
          isFetching={isFetching}
        />

        <Grid
          gap={4}
          templateColumns={{ base: '1fr', lg: '1.2fr 1fr' }}
        >
          <CampaignTopRanking campaigns={topCampaigns} />
          <CampaignCostBreakdown items={messageTypeBreakdown} />
        </Grid>
      </Stack>
    </AppContentLayout>
  )
}
