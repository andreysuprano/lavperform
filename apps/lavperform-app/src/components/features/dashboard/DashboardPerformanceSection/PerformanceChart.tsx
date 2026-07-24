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

import { RechartsFrame, useRechartsTheme } from '@/hooks/useRechartsTheme'
import { formatCurrency } from '@/utils/money'

import { Props } from './PerformanceChart.types'

const CHART_HEIGHT = { base: '260px', md: '320px' }

function PerformanceChartBase({ data = [] }: Props) {
  const { color, colorPalette, tooltipStyle, gridStroke, axisStroke, cursorFill } =
    useRechartsTheme()

  const series = useMemo(
    () => ({
      count: {
        label: 'Pedidos',
        color: color(`${colorPalette}.400`),
      },
      revenue: {
        label: 'Faturamento',
        color: color('orange.400'),
      },
    }),
    [color, colorPalette]
  )

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
          <Heading size="md">Últimos 6 meses</Heading>
          <Text
            color="fg.muted"
            fontSize="sm"
          >
            Quantidade de pedidos e faturamento por mês.
          </Text>
        </Stack>

        <Box
          h={CHART_HEIGHT}
          w="100%"
        >
          {hasData ? (
            <RechartsFrame
              h="100%"
              w="100%"
            >
              <ResponsiveContainer
                height="100%"
                width="100%"
              >
                <ComposedChart data={data}>
                  <CartesianGrid
                    stroke={gridStroke}
                    vertical={false}
                  />
                  <XAxis
                    axisLine={false}
                    dataKey="label"
                    fontSize={11}
                    stroke={axisStroke}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    fontSize={11}
                    stroke={axisStroke}
                    tickLine={false}
                    width={28}
                    yAxisId="count"
                  />
                  <YAxis
                    axisLine={false}
                    fontSize={11}
                    orientation="right"
                    stroke={axisStroke}
                    tickFormatter={(value) => `R$ ${value / 1000}k`}
                    tickLine={false}
                    width={48}
                    yAxisId="revenue"
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{
                      fill: cursorFill,
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
                    dataKey="count"
                    fill={series.count.color}
                    isAnimationActive={false}
                    name={series.count.label}
                    radius={[6, 6, 0, 0]}
                    yAxisId="count"
                  />
                  <Line
                    dataKey="totalValue"
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                    name={series.revenue.label}
                    stroke={series.revenue.color}
                    strokeWidth={3}
                    type="monotone"
                    yAxisId="revenue"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </RechartsFrame>
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
