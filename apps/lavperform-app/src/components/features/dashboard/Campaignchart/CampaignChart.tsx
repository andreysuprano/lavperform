import {
  Box,
  Card,
  Flex,
  Grid,
  Heading,
  HStack,
  Spinner,
  Text,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import {
  Area,
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
import type { DashCampaignsProps } from '@/types'
import { formatCurrency } from '@/utils/money'

type CampaignChartProps = {
  campaigns?: DashCampaignsProps
  isFetching?: boolean
}

type ChartPoint = {
  day: string
  messages: number
  clicks: number
  sales: number
  errors: number
  salesAmount: number
}

function formatTooltipValue(name: string, value: number) {
  if (name === 'Receita') return formatCurrency(value)
  return value.toLocaleString('pt-BR')
}

export function CampaignChart({
  campaigns,
  isFetching = false,
}: CampaignChartProps) {
  const {
    color,
    colorPalette,
    tooltipStyle,
    gridStroke,
    axisStroke,
  } = useRechartsTheme()

  const chartData = useMemo<ChartPoint[]>(() => {
    return (campaigns?.messagesSentByDate ?? []).map((point) => ({
      day: point.day,
      messages: Number(point.messages) || 0,
      clicks: Number(point.clicks) || 0,
      sales: Number(point.sales) || 0,
      errors: Number(point.errors) || 0,
      salesAmount: Number(point.salesAmount) || 0,
    }))
  }, [campaigns?.messagesSentByDate])

  const hasActivity = useMemo(
    () =>
      chartData.some(
        (d) =>
          d.messages > 0 ||
          d.clicks > 0 ||
          d.sales > 0 ||
          d.errors > 0 ||
          d.salesAmount > 0
      ),
    [chartData]
  )

  const fills = useMemo(
    () => ({
      messages: color(`${colorPalette}.400`),
      clicks: color('orange.400'),
      sales: color('green.500'),
      errors: color('red.400'),
      revenueFill: color(`${colorPalette}.200`),
      revenueStroke: color(`${colorPalette}.600`),
    }),
    [color, colorPalette]
  )

  if (!campaigns?.messagesSentByDate || campaigns.messagesSentByDate.length < 1) {
    return null
  }

  return (
    <Card.Root size="sm">
      <Card.Header
        alignItems={{ base: 'stretch', sm: 'center' }}
        as={Flex}
        direction={{ base: 'column', sm: 'row' }}
        gap={3}
        justifyContent="space-between"
      >
        <HStack
          align="flex-start"
          gap={2}
          justify="space-between"
          w="full"
        >
          <Flex
            direction="column"
            gap={0.5}
          >
            <Heading
              size="md"
              whiteSpace="nowrap"
            >
              Tendência dia a dia
            </Heading>
            <Text
              color="fg.muted"
              fontSize="xs"
            >
              Envios, engajamento, vendas e receita no período
            </Text>
          </Flex>
          {isFetching && (
            <Spinner
              color="fg.muted"
              size="sm"
            />
          )}
        </HStack>
      </Card.Header>
      <Card.Body gap={4}>
        {!hasActivity ? (
          <Text
            color="fg.muted"
            fontSize="sm"
            py={8}
            textAlign="center"
          >
            Sem atividade de campanhas neste período.
          </Text>
        ) : (
          <Grid
            gap={4}
            templateColumns={{ base: '1fr', xl: '1.6fr 1fr' }}
          >
            <RechartsFrame
              maxH="360px"
              minH="280px"
              w="100%"
            >
              <ResponsiveContainer
                height={300}
                width="100%"
              >
                <ComposedChart data={chartData}>
                  <CartesianGrid
                    stroke={gridStroke}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    stroke={axisStroke}
                    tickFormatter={(value: string) => value.slice(0, 6)}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={axisStroke}
                    tickLine={false}
                    width={36}
                    yAxisId="left"
                  />
                  <YAxis
                    orientation="right"
                    stroke={axisStroke}
                    tickFormatter={(v) =>
                      Number(v).toLocaleString('pt-BR', {
                        notation: 'compact',
                        maximumFractionDigits: 1,
                      })
                    }
                    tickLine={false}
                    width={48}
                    yAxisId="right"
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                      formatTooltipValue(String(name), Number(value)),
                      String(name),
                    ]}
                  />
                  <Legend />
                  <Bar
                    dataKey="messages"
                    fill={fills.messages}
                    isAnimationActive={false}
                    name="Envios"
                    radius={[3, 3, 0, 0]}
                    yAxisId="left"
                  />
                  <Bar
                    dataKey="clicks"
                    fill={fills.clicks}
                    isAnimationActive={false}
                    name="Cliques"
                    radius={[3, 3, 0, 0]}
                    yAxisId="left"
                  />
                  <Bar
                    dataKey="sales"
                    fill={fills.sales}
                    isAnimationActive={false}
                    name="Vendas"
                    radius={[3, 3, 0, 0]}
                    yAxisId="left"
                  />
                  <Area
                    dataKey="salesAmount"
                    fill={fills.revenueFill}
                    fillOpacity={0.35}
                    isAnimationActive={false}
                    name="Receita"
                    stroke={fills.revenueStroke}
                    strokeWidth={2}
                    type="monotone"
                    yAxisId="right"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </RechartsFrame>

            <Box
              borderColor="border.muted"
              borderRadius="md"
              borderWidth="1px"
              p={3}
            >
              <Flex
                direction="column"
                gap={0.5}
                mb={2}
              >
                <Heading size="sm">Saúde dos envios</Heading>
                <Text
                  color="fg.muted"
                  fontSize="xs"
                >
                  Mensagens com falha no envio
                </Text>
              </Flex>
              <RechartsFrame
                maxH="280px"
                minH="200px"
                w="100%"
              >
                <ResponsiveContainer
                  height={220}
                  width="100%"
                >
                  <ComposedChart data={chartData}>
                    <CartesianGrid
                      stroke={gridStroke}
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      stroke={axisStroke}
                      tickFormatter={(value: string) => value.slice(0, 6)}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke={axisStroke}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => [
                        Number(value).toLocaleString('pt-BR'),
                        'Erros',
                      ]}
                    />
                    <Line
                      dataKey="errors"
                      dot={false}
                      isAnimationActive={false}
                      name="Erros"
                      stroke={fills.errors}
                      strokeWidth={2}
                      type="monotone"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </RechartsFrame>
            </Box>
          </Grid>
        )}
      </Card.Body>
    </Card.Root>
  )
}
