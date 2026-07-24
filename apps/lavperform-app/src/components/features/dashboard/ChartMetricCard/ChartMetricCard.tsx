import { Box, Card, FormatNumber, Stat, Text } from '@chakra-ui/react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'

import { RechartsFrame, useRechartsTheme } from '@/hooks/useRechartsTheme'

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
  const { color, colorPalette } = useRechartsTheme()
  const seriesColor = color(`${colorPalette}.400`)
  const trend = data.length && data[0].value / maxValue

  return (
    <Card.Root
      flex={1}
      flexGrow={1}
      overflow="hidden"
      size="sm"
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
            lineHeight="shorter"
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
      <Box position="relative">
        {showTrend && (
          <Text
            bottom={0}
            fontSize="2xs"
            left={2}
            position="absolute"
            zIndex={1}
          >
            <FormatNumber
              maximumFractionDigits={2}
              style="percent"
              value={trend || 0}
            />
          </Text>
        )}
        <RechartsFrame h="40px">
          <ResponsiveContainer
            height="100%"
            width="100%"
          >
            <AreaChart
              data={data}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <YAxis
                domain={[0, maxValue ? maxValue : 'auto']}
                hide
              />
              <Area
                activeDot={false}
                dataKey="value"
                fill={seriesColor}
                fillOpacity={0.2}
                isAnimationActive={false}
                stroke={seriesColor}
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </RechartsFrame>
      </Box>
    </Card.Root>
  )
}

export { ChartMetricCard, type Props as ChartMetricCardProps }
