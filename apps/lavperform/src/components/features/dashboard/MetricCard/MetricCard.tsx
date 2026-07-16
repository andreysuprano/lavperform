import {
  Badge,
  Box,
  Card,
  FormatNumber,
  HStack,
  Icon,
  Show,
  Stat,
  VStack,
} from '@chakra-ui/react'
import { memo } from 'react'

import { Props } from './MetricCard.types'

const MetricCardComponent = ({
  change,
  icon,
  inline = true,
  label,
  size = 'md',
  value,
  valueType = 'number',
}: Props) => {
  const valueTypeProps: Record<string, object> = {
    number: {
      compactDisplay: 'short',
      notation: 'compact',
    },
    currency: {
      style: 'currency',
      notation: 'compact',
      currency: 'BRL',
    },
    'currency-full': {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
    percent: {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
      style: 'percent',
    },
  }

  return (
    <Card.Root size="sm">
      <Card.Body
        alignItems={inline ? '' : 'flex-start'}
        as={HStack}
        gap={size === 'sm' ? 2 : 4}
        p={size === 'sm' ? 2 : 4}
      >
        <Box
          bg="primary"
          borderRadius="md"
          lineHeight={0}
          p={size === 'sm' ? 3 : 4}
        >
          <Show
            fallback={
              <Icon
                as={icon}
                color="gray.800"
                size="md"
              />
            }
            when={size === 'md'}
          >
            <Icon
              as={icon}
              color="gray.800"
              size="xl"
            />
          </Show>
        </Box>
        <Stat.Root gap={0}>
          <Stat.Label fontSize={size === 'sm' ? 'xs' : ''}>{label}</Stat.Label>
          <Box
            alignItems={inline ? '' : 'flex-start'}
            as={inline ? HStack : VStack}
            gap={inline ? 2 : 0}
          >
            <Stat.ValueText fontSize={size === 'sm' ? 'xl' : '2xl'}>
              <FormatNumber
                {...valueTypeProps[valueType]}
                value={Math.abs(Number(value))}
              />
            </Stat.ValueText>
            {change != null && (
              <Badge
                colorPalette={change > 0 ? 'green' : 'red'}
                gap={0}
              >
                <Show
                  fallback={<Stat.DownIndicator />}
                  when={change > 0}
                >
                  <Stat.UpIndicator />
                </Show>
                <FormatNumber
                  maximumFractionDigits={1}
                  minimumFractionDigits={1}
                  style="percent"
                  value={Math.abs(change)}
                />
              </Badge>
            )}
          </Box>
        </Stat.Root>
      </Card.Body>
    </Card.Root>
  )
}

const MetricCard = memo(MetricCardComponent)

export { MetricCard, type Props as MetricCardProps }
