import { Chart, type UseChartReturn } from '@chakra-ui/charts'
import {
  Box,
  Card,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo } from 'react'
import { LuChartColumnBig } from 'react-icons/lu'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  ChartMetricCard,
  DateRangeFilter,
  type DateRangeValue,
} from '@/components'
import { formatCurrency } from '@/utils/money'

import { CampaignMessagesSection } from './CampaignMessagesSection'

type ChartDatum = {
  clicks: number
  day: string
  messages: number
  sales: number
}

interface CampaignMetricsShape {
  campaignMetric: {
    interactions: number
    messagesDelivered: number
    messagesError: number
    messagesSent: number
    salesTotalAmount: string
    salesTotalQuantity: number
    totalCustomers: number
  }
  messagesSentByDate: Array<{
    clicks: number
    day: string
    messages: number
    sales: number
  }>
}

interface ChartSeriesItem {
  name: 'messages' | 'clicks' | 'sales'
  label: string
  color: string
}

interface Props {
  campaignId: string | undefined
  companyId: string | undefined
  dateRange: DateRangeValue
  onDateRangeChange: (value: DateRangeValue) => void
  metrics: CampaignMetricsShape
  chart: UseChartReturn<ChartDatum>
  chartSeries: ChartSeriesItem[]
}

function PerformanceTabComponent({
  campaignId,
  companyId,
  dateRange,
  onDateRangeChange,
  metrics,
  chart,
  chartSeries,
}: Props) {
  const { campaignMetric, messagesSentByDate } = metrics

  return (
    <Box
      h="100%"
      maxW="full"
      minH={0}
      minW={0}
      overflowX="hidden"
      overflowY="auto"
      p={{ base: 4, md: 6 }}
      w="full"
    >
      <Stack
        gap={{ base: 5, md: 6 }}
        maxW="full"
        minW={0}
        w="full"
      >
          <Flex
            align={{ base: 'stretch', sm: 'center' }}
            direction={{ base: 'column', sm: 'row' }}
            gap={3}
            justify="space-between"
            w="full"
          >
            <Stack gap={0}>
              <Heading
                fontSize="md"
                fontWeight="semibold"
                letterSpacing="tight"
              >
                Resumo de performance
              </Heading>
              <Text
                color="fg.muted"
                fontSize="xs"
              >
                Métricas agregadas do período selecionado
              </Text>
            </Stack>
            <DateRangeFilter
              onChange={onDateRangeChange}
              presets={[7, 14, 30]}
              size="sm"
              value={dateRange}
            />
          </Flex>

          <SimpleGrid
            columns={{ base: 1, sm: 2, lg: 4 }}
            gap={3}
          >
            <ChartMetricCard
              data={[
                { value: campaignMetric.messagesSent },
                { value: campaignMetric.interactions },
              ]}
              label="Envios"
              maxValue={campaignMetric.messagesSent}
              showTrend
              value={campaignMetric.messagesSent}
            />
            <ChartMetricCard
              data={[
                { value: campaignMetric.interactions },
                { value: campaignMetric.salesTotalQuantity },
              ]}
              label="Cliques"
              maxValue={campaignMetric.messagesSent}
              showTrend
              value={campaignMetric.interactions}
            />
            <ChartMetricCard
              data={[
                { value: campaignMetric.salesTotalQuantity },
                { value: campaignMetric.salesTotalQuantity },
              ]}
              label="Vendas"
              maxValue={campaignMetric.messagesSent}
              showTrend
              value={campaignMetric.salesTotalQuantity}
            />
            <ChartMetricCard
              label="Receita"
              value={formatCurrency(Number(campaignMetric.salesTotalAmount))}
            />
          </SimpleGrid>

          <Card.Root
            bg="bg.panel"
            borderColor="border.muted"
            borderWidth="1px"
            maxW="full"
            minW={0}
            overflow="hidden"
            shadow="xs"
            size="sm"
            w="full"
          >
            <Card.Body
              gap={4}
              p={{ base: 3, md: 5 }}
            >
              <HStack
                align="center"
                gap={2.5}
                justify="space-between"
              >
                <HStack gap={2.5}>
                  <Flex
                    align="center"
                    bg="colorPalette.subtle"
                    borderRadius="lg"
                    color="colorPalette.fg"
                    h={9}
                    justify="center"
                    w={9}
                  >
                    <LuChartColumnBig size={18} />
                  </Flex>
                  <Stack gap={0}>
                    <Heading
                      fontSize="sm"
                      fontWeight="semibold"
                      letterSpacing="tight"
                    >
                      Envios ao longo do tempo
                    </Heading>
                    <Text
                      color="fg.muted"
                      fontSize="xs"
                    >
                      Comparativo diário de envios, cliques e vendas
                    </Text>
                  </Stack>
                </HStack>
              </HStack>

              <Box
                h={{ base: '260px', md: '320px' }}
                w="100%"
              >
                <Chart.Root
                  chart={chart}
                  height="100%"
                  width="100%"
                >
                  <ResponsiveContainer
                    height="100%"
                    width="100%"
                  >
                    <BarChart data={messagesSentByDate}>
                      <CartesianGrid
                        stroke={chart.color('bg.emphasized')}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="day"
                        fontSize={11}
                        stroke={chart.color('fg.muted')}
                        tickFormatter={(value) => value.slice(0, 6)}
                        tickLine={false}
                      />
                      <YAxis
                        axisLine={false}
                        fontSize={11}
                        stroke={chart.color('fg.muted')}
                        tickLine={false}
                        width={28}
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
                          opacity: 0.5,
                        }}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: 12 }}
                      />
                      {chartSeries.map((item) => (
                        <Bar
                          dataKey={chart.key(item.name)}
                          fill={chart.color(item.color)}
                          isAnimationActive={false}
                          key={item.name}
                          name={item.label}
                          radius={[6, 6, 0, 0]}
                          stroke={chart.color(item.color)}
                        >
                          <LabelList
                            dataKey={chart.key(item.name)}
                            fontSize={10}
                            position="top"
                            style={{
                              fontWeight: 600,
                              fill: chart.color('fg'),
                            }}
                          />
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </Chart.Root>
              </Box>
            </Card.Body>
          </Card.Root>

          <Box
            bg="bg.panel"
            borderColor="border.muted"
            borderRadius="xl"
            borderWidth="1px"
            maxW="full"
            minW={0}
            overflow="hidden"
            p={{ base: 4, md: 5 }}
            shadow="xs"
            w="full"
          >
            <CampaignMessagesSection
              campaignId={campaignId}
              companyId={companyId}
            />
          </Box>
        </Stack>
      </Box>
  )
}

const PerformanceTab = memo(PerformanceTabComponent)

export { PerformanceTab }
