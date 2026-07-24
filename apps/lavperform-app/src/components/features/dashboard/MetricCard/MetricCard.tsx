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

  const isSm = size === 'sm'

  return (
    <Card.Root
      h="full"
      size="sm"
    >
      <Card.Body
        alignItems={inline ? 'center' : 'flex-start'}
        as={HStack}
        gap={isSm ? 3 : 4}
        p={isSm ? 3 : 4}
      >
        <Box
          bg="primary"
          borderRadius="md"
          flexShrink={0}
          lineHeight={0}
          p={isSm ? 3 : 4}
        >
          <Show
            fallback={
              <Icon
                as={icon}
                color="gray.800"
                size="md"
              />
            }
            when={!isSm}
          >
            <Icon
              as={icon}
              color="gray.800"
              size="xl"
            />
          </Show>
        </Box>
        <Stat.Root
          gap={0}
          minW={0}
        >
          <Stat.Label
            color="fg.muted"
            fontSize={isSm ? 'xs' : 'sm'}
            fontWeight="medium"
            lineClamp={1}
          >
            {label}
          </Stat.Label>
          <Box
            alignItems={inline ? 'center' : 'flex-start'}
            as={inline ? HStack : VStack}
            gap={inline ? 2 : 0}
            mt={0.5}
          >
            <Stat.ValueText
              fontSize={isSm ? 'xl' : '2xl'}
              fontWeight="bold"
              letterSpacing="-0.02em"
              lineHeight="1.1"
            >
              {valueType === 'text' ? (
                value
              ) : (
                <FormatNumber
                  {...valueTypeProps[valueType]}
                  value={Math.abs(Number(value))}
                />
              )}
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
