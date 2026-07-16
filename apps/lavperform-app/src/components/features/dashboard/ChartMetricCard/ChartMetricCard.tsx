import { Chart, useChart } from '@chakra-ui/charts'
import { Box, Card, FormatNumber, Stat, Text } from '@chakra-ui/react'
import { Area, AreaChart, YAxis } from 'recharts'

import { useWhiteLabel } from '@/config'

import { Props } from './ChartMetricCard.types'

const ChartMetricCard = ({
  data = [],
  icon: Icon,
  label,
  value,
  helpText,
  helpTextColor = 'green.500',
  maxValue = 100,
  showTrend = false,
}: Props) => {
  const { colorPalette } = useWhiteLabel()

  const chart = useChart({
    data: [...data],
    series: [{ color: `${colorPalette}.400` }],
  })

  const trend = data.length && data[0].value / maxValue

  return (
    <Card.Root
      flex={1}
      flexGrow={1}
      overflow={'hidden'}
      size={'sm'}
    >
      <Card.Body
        p={2}
        pb={0}
      >
        <Stat.Root textAlign="left">
          <Stat.Label
            alignItems="center"
            color="fg.muted"
            display="flex"
            fontSize="xs"
            gap={2}
            lineHeight={'shorter'}
          >
            {Icon && <Icon size={20} />} {label}
          </Stat.Label>
          <Stat.ValueText
            fontSize="xl"
            fontWeight="bold"
          >
            {value}
          </Stat.ValueText>
          {helpText && (
            <Box
              color={helpTextColor}
              fontSize="sm"
            >
              {helpText}
            </Box>
          )}
        </Stat.Root>
      </Card.Body>
      <Box position={'relative'}>
        {showTrend && (
          <Text
            bottom={0}
            fontSize="2xs"
            left={2}
            position={'absolute'}
            zIndex={1}
          >
            <FormatNumber
              maximumFractionDigits={2}
              style="percent"
              value={trend || 0}
            />
          </Text>
        )}
        <Chart.Root
          chart={chart}
          height="10"
        >
          <AreaChart
            data={chart.data}
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          >
            <YAxis
              domain={[0, maxValue ? maxValue : 'auto']}
              hide={true}
            />
            {chart.series.map((item, index) => (
              <Area
                activeDot={false}
                dataKey={chart.key(item.name)}
                fill={chart.color(item.color)}
                fillOpacity={0.2}
                isAnimationActive={false}
                key={index}
                stroke={chart.color(item.color)}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </Chart.Root>
      </Box>
    </Card.Root>
  )
}

export { ChartMetricCard, type Props as ChartMetricCardProps }
