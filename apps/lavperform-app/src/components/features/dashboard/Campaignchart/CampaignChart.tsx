import { Chart, useChart } from '@chakra-ui/charts'
import { Card, Flex, Heading, HStack, Spinner } from '@chakra-ui/react'
import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useWhiteLabel } from '@/config'
import type { DashCampaignsProps } from '@/types'

type CampaignChartProps = {
  campaigns?: DashCampaignsProps
  isFetching?: boolean
}

export function CampaignChart({
  campaigns,
  isFetching = false,
}: CampaignChartProps) {
  const { colors, colorPalette } = useWhiteLabel()

  const chartData = useMemo(() => {
    return [...(campaigns?.messagesSentByDate ?? [])]
  }, [campaigns?.messagesSentByDate])

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

  if (!campaigns?.messagesSentByDate || campaigns.messagesSentByDate.length < 1)
    return null

  return (
    <Card.Root size={'sm'}>
      <Card.Header
        alignItems={{ base: 'stretch', sm: 'center' }}
        as={Flex}
        direction={{ base: 'column', sm: 'row' }}
        gap={3}
        justifyContent={'space-between'}
      >
        <HStack gap={2}>
          <Heading
            size="md"
            whiteSpace="nowrap"
          >
            Dia a Dia
          </Heading>
          {isFetching && (
            <Spinner
              color={colors.primary}
              size="sm"
            />
          )}
        </HStack>
      </Card.Header>
      <Card.Body gap={4}>
        <Chart.Root
          chart={chart}
          display={{ base: 'none', md: 'block' }}
          height={'100%'}
          maxH="sm"
          width={'100%'}
        >
          <BarChart
            data={chartData}
            height={300}
            width={800}
          >
            <CartesianGrid stroke={chart.color('border.emphasized')} />
            <XAxis
              dataKey="day"
              tickFormatter={(value) => value.slice(0, 6)}
            />
            <YAxis width={16} />
            <Tooltip
              contentStyle={{
                borderColor: chart.color('border.muted'),
                backgroundColor: chart.color('bg'),
                color: chart.color('fg'),
              }}
              cursor={{ fill: chart.color('bg.emphasized'), opacity: 0.5 }}
            />
            <Legend />
            {chartSeries.map((item) => (
              <Bar
                dataKey={chart.key(item.name)}
                fill={chart.color(item.color)}
                isAnimationActive={false}
                key={item.name}
                name={item.label}
                stroke={chart.color(item.color)}
              >
                <LabelList
                  dataKey={chart.key(item.name)}
                  position="top"
                  style={{ fontWeight: '600', fill: chart.color('fg') }}
                />
              </Bar>
            ))}
          </BarChart>
        </Chart.Root>
        <Chart.Root
          chart={chart}
          display={{ base: 'block', md: 'none' }}
          height={'100%'}
          maxH="sm"
          width={'100%'}
        >
          <BarChart
            data={chartData}
            height={300}
            layout="vertical"
            width={800}
          >
            <CartesianGrid stroke={chart.color('bg.emphasized')} />
            <XAxis type="number" />
            <YAxis
              dataKey="day"
              tickFormatter={(value) => value.slice(0, 6)}
              type="category"
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                borderColor: chart.color('border.muted'),
                boxShadow: 'none',
                backgroundColor: chart.color('bg'),
                color: chart.color('fg'),
              }}
              cursor={{ fill: chart.color('bg.emphasized'), opacity: 0.5 }}
            />
            <Legend />
            {chartSeries.map((item) => (
              <Bar
                dataKey={chart.key(item.name)}
                fill={chart.color(item.color)}
                isAnimationActive={false}
                key={item.name}
                name={item.label}
                stroke={chart.color(item.color)}
              >
                <LabelList
                  dataKey={chart.key(item.name)}
                  position="top"
                  style={{ fontWeight: '600', fill: chart.color('fg') }}
                />
              </Bar>
            ))}
          </BarChart>
        </Chart.Root>
      </Card.Body>
    </Card.Root>
  )
}
