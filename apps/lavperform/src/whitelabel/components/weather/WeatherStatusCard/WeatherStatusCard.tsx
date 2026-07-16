import { Card, HStack, Icon, Stack, Switch, Text } from '@chakra-ui/react'
import { memo } from 'react'
import { LuCloudRain } from 'react-icons/lu'

import { Tooltip } from '@/components'
import { Props } from './WeatherStatusCard.types'

function WeatherStatusCardBase({ enabled, onToggle }: Props) {
  return (
    <Card.Root>
      <Card.Body>
        <HStack
          gap={4}
          justify="space-between"
        >
          <HStack gap={4}>
            <Icon
              as={LuCloudRain}
              boxSize={10}
              color={enabled ? 'primary.500' : 'fg.muted'}
            />
            <Stack gap={0}>
              <Text
                fontSize="lg"
                fontWeight="bold"
              >
                Alertas Climáticos
              </Text>
              <Text
                color="fg.muted"
                fontSize="sm"
              >
                Envie alertas automáticos baseados em condições do tempo
              </Text>
            </Stack>
          </HStack>
          <Tooltip
            content={
              enabled
                ? 'Desative para pausar os alertas automáticos'
                : 'Ative para começar a enviar alertas aos seus clientes'
            }
            positioning={{ placement: 'top' }}
          >
            <Switch.Root
              checked={enabled}
              onCheckedChange={({ checked }) => onToggle(checked)}
              size="lg"
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </Tooltip>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}

const WeatherStatusCard = memo(WeatherStatusCardBase) as typeof WeatherStatusCardBase

export { WeatherStatusCard, type Props as WeatherStatusCardProps }
