import {
  Card,
  HStack,
  Icon,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo } from 'react'
import type { FieldValues, Path } from 'react-hook-form'
import {
  LuCloud,
  LuCloudRain,
  LuSnowflake,
  LuSun,
} from 'react-icons/lu'

import { Textarea } from '@/components'
import type { WeatherConditionAPI } from '@/whitelabel/types'

import type { Props } from './WeatherAlertMessagesCard.types'

const messageFields: Array<{
  key: WeatherConditionAPI
  title: string
  icon: typeof LuCloudRain
}> = [
  { key: 'RAINING', title: 'Chuva', icon: LuCloudRain },
  { key: 'SUNNY', title: 'Sol Intenso', icon: LuSun },
  { key: 'CLOUDY', title: 'Nublado', icon: LuCloud },
  { key: 'COLD', title: 'Temperatura Baixa', icon: LuSnowflake },
]

function WeatherAlertMessagesCardBase<T extends FieldValues>({
  control,
  name,
  disabled = false,
}: Props<T>) {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Mensagens dos Alertas</Card.Title>
        <Card.Description>
          Configure a mensagem enviada para cada tipo de alerta climático.
          Use {'{nome}'}, {'{empresa}'} e {'{temperatura}'} como variáveis.
        </Card.Description>
      </Card.Header>
      <Card.Body>
        <Stack gap={5}>
          {messageFields.map((field) => (
            <Stack
              key={field.key}
              gap={2}
            >
              <HStack gap={2}>
                <Icon
                  as={field.icon}
                  boxSize={5}
                  color="fg.muted"
                />
                <Text fontWeight="semibold">{field.title}</Text>
              </HStack>
              <Textarea
                control={control}
                disabled={disabled}
                name={`${name}.${field.key}` as Path<T>}
                placeholder={`Mensagem para alerta de ${field.title.toLowerCase()}`}
                resize="vertical"
                rows={3}
              />
            </Stack>
          ))}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

const WeatherAlertMessagesCard = memo(
  WeatherAlertMessagesCardBase
) as typeof WeatherAlertMessagesCardBase

export {
  WeatherAlertMessagesCard,
  type Props as WeatherAlertMessagesCardProps,
}
