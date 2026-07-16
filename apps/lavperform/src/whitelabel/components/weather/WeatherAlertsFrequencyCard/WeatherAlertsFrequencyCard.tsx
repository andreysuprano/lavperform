import { Card, HStack, Slider, Stack, Text } from '@chakra-ui/react'
import { memo } from 'react'

import { Tooltip } from '@/components'
import { Props } from './WeatherAlertsFrequencyCard.types'

function WeatherAlertsFrequencyCardBase({
  value,
  onChange,
  disabled = false,
}: Props) {
  const marks = [
    { value: 1, label: '1' },
    { value: 10, label: '10' },
    { value: 20, label: '20' },
    { value: 30, label: '30' },
    { value: 40, label: '40' },
    { value: 50, label: '50' },
  ]

  return (
    <Card.Root opacity={disabled ? 0.6 : 1}>
      <Card.Header>
        <HStack
          justify="space-between"
          w="full"
        >
          <Stack gap={0}>
            <Card.Title>Frequência de Alertas</Card.Title>
            <Card.Description>
              Defina quantos alertas serão enviados por dia
            </Card.Description>
          </Stack>
          <Tooltip
            content="Defina quantos alertas serão enviados aos seus clientes por dia"
            positioning={{ placement: 'top' }}
          >
            <Text
              color="primary.500"
              fontSize="3xl"
              fontWeight="bold"
            >
              {value}
            </Text>
          </Tooltip>
        </HStack>
      </Card.Header>
      <Card.Body>
        <Stack gap={6}>
          <Slider.Root
            disabled={disabled}
            max={50}
            min={1}
            onValueChange={({ value: newValue }) => onChange(newValue[0])}
            step={1}
            value={[value]}
          >
            <Slider.Control>
              <Slider.Track>
                <Slider.Range />
              </Slider.Track>
              <Slider.Thumb index={0} />
            </Slider.Control>
            <Slider.MarkerGroup>
              {marks.map((mark) => (
                <Slider.Marker
                  key={mark.value}
                  value={mark.value}
                >
                  <Slider.MarkerIndicator />
                </Slider.Marker>
              ))}
            </Slider.MarkerGroup>
          </Slider.Root>
          <HStack
            fontSize="xs"
            justify="space-between"
          >
            {marks.map((mark) => (
              <Text
                key={mark.value}
                color="fg.muted"
              >
                {mark.label}
              </Text>
            ))}
          </HStack>
          <Text
            color="fg.muted"
            fontSize="sm"
            textAlign="center"
          >
            {value === 1 ? '1 alerta por dia' : `${value} alertas por dia`}
          </Text>
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

const WeatherAlertsFrequencyCard = memo(
  WeatherAlertsFrequencyCardBase
) as typeof WeatherAlertsFrequencyCardBase

export {
  WeatherAlertsFrequencyCard,
  type Props as WeatherAlertsFrequencyCardProps,
}
