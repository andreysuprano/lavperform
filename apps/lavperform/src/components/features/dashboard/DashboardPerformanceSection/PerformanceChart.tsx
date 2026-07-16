import { Chart, useChart } from '@chakra-ui/charts'
import { Box, Card, Center, Heading, Stack, Text } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useWhiteLabel } from '@/config'
import { formatCurrency } from '@/utils/money'

import { Props } from './PerformanceChart.types'

const CHART_HEIGHT = { base: '260px', md: '320px' }

function PerformanceChartBase({ data = [] }: Props) {
  const { colorPalette } = useWhiteLabel()

  const chartSeries = useMemo(
    () => [
      {
        name: 'count' as const,
        label: 'Quantidade de Vendas',
        color: `${colorPalette}.400`,
      },
      {
        name: 'totalValue' as const,
        label: 'Faturamento',
        color: 'orange.400',
      },
    ],
    [colorPalette]
  )

  const chart = useChart({
    data,
    series: chartSeries,
  })

  const countSeries = chartSeries[0]
  const revenueSeries = chartSeries[1]
  const hasData = data.length > 0

  return (
    <Card.Root
      borderColor="border.muted"
      borderWidth="1px"
      size="sm"
      shadow="xs"
    >
      <Card.Body gap={4}>
        <Stack gap={1}>
          <Heading size="md">Vendas dos últimos 6 meses</Heading>
          <Text
            color="fg.muted"
            fontSize="sm"
          >
            Comparativo mensal de quantidade de vendas e faturamento.
          </Text>
        </Stack>

        <Box
          h={CHART_HEIGHT}
          w="100%"
        >
          {hasData ? (
            <Chart.Root
              chart={chart}
              height="100%"
              width="100%"
            >
              <ResponsiveContainer
                height="100%"
                width="100%"
              >
                <ComposedChart data={data}>
                  <CartesianGrid
                    stroke={chart.color('bg.emphasized')}
                    vertical={false}
                  />
                  <XAxis
                    axisLine={false}
                    dataKey="label"
                    fontSize={11}
                    stroke={chart.color('fg.muted')}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    fontSize={11}
                    stroke={chart.color('fg.muted')}
                    tickLine={false}
                    width={28}
                    yAxisId="count"
                  />
                  <YAxis
                    axisLine={false}
                    fontSize={11}
                    orientation="right"
                    stroke={chart.color('fg.muted')}
                    tickFormatter={(value) => `R$ ${value / 1000}k`}
                    tickLine={false}
                    width={48}
                    yAxisId="revenue"
                  />
                  <Tooltip
                    contentStyle={{
                      borderColor: chart.color('border.muted'),
                      backgroundColor: chart.color('bg'),
                      color: chart.color('fg'),
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    cursor={{
                      fill: chart.color('bg.emphasized'),
                      opacity: 0.35,
                    }}
                    formatter={(value, name) => {
                      if (name === 'Faturamento') {
                        return [formatCurrency(Number(value)), name]
                      }

                      return [value, name]
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Bar
                    dataKey={chart.key(countSeries.name)}
                    fill={chart.color(countSeries.color)}
                    isAnimationActive={false}
                    name={countSeries.label}
                    radius={[6, 6, 0, 0]}
                    yAxisId="count"
                  />
                  <Line
                    dataKey={chart.key(revenueSeries.name)}
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                    name={revenueSeries.label}
                    stroke={chart.color(revenueSeries.color)}
                    strokeWidth={3}
                    type="monotone"
                    yAxisId="revenue"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Chart.Root>
          ) : (
            <Center
              h="100%"
              px={4}
            >
              <Stack
                gap={1}
                textAlign="center"
              >
                <Text
                  fontSize="sm"
                  fontWeight="medium"
                >
                  Gráfico indisponível
                </Text>
                <Text
                  color="fg.muted"
                  fontSize="sm"
                >
                  Sem dados suficientes para exibir o gráfico.
                </Text>
              </Stack>
            </Center>
          )}
        </Box>
      </Card.Body>
    </Card.Root>
  )
}

const PerformanceChart = memo(PerformanceChartBase) as typeof PerformanceChartBase

export { PerformanceChart, type Props as PerformanceChartProps }
