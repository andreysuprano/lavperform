import { Flex, Spinner, Stack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { GrCycle } from 'react-icons/gr'
import { LuCircleDollarSign, LuPercent, LuSend, LuShoppingCart } from 'react-icons/lu'
import { useSearchParams } from 'react-router-dom'

import {
  AppContentLayout,
  CampaignChart,
  CampaignPageBanner,
  DateRangeFilter,
  type DateRangeValue,
  GridLayout,
  isSameDateRange,
  MetricCard,
  MetricCardProps,
  parseDateRangeFromSearch,
  toaster,
} from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useDashboardCampaigns } from '@/hooks/queries'

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

  const sectionCards: MetricCardProps[] = useMemo(() => {
    return [
      {
        icon: LuSend,
        size: 'sm',
        label: 'Total de envios',
        value: campaigns?.activeCampaigns.messagesSent ?? 0,
      },
      {
        icon: LuShoppingCart,
        size: 'sm',
        label: 'Pedidos Gerados',
        value: campaigns?.activeCampaigns.salesTotalQuantity ?? 0,
      },
      {
        icon: LuPercent,
        label: 'Taxa de Conversão',
        size: 'sm',
        value: Number(campaigns?.activeCampaigns.conversionRate ?? 0) / 100,
        valueType: 'percent',
      },
      {
        icon: LuCircleDollarSign,
        label: 'Receita Incentivada',
        size: 'sm',
        value: Number(campaigns?.activeCampaigns.salesTotalAmount ?? 0),
        valueType: 'currency-full',
      },
    ]
  }, [campaigns])

  if (isLoading) {
    return <CampaignIndexSkeletonLoading />
  }

  return (
    <AppContentLayout
      icon={<GrCycle />}
      title="Fidelização e Recorrência"
    >
      <Stack gap={4}>
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
            Métricas do período:
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
        <GridLayout
          columns={{ base: 1, sm: 2, lg: 4 }}
          items={sectionCards}
          renderItem={(card, idx) => (
            <MetricCard
              key={idx}
              {...card}
            />
          )}
        />
        <CampaignChart
          campaigns={campaigns}
          isFetching={isFetching}
        />
      </Stack>
    </AppContentLayout>
  )
}
