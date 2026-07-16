import {
  Box,
  Card,
  Checkbox,
  HStack,
  Icon,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo, useCallback } from 'react'
import { LuCloudRain, LuSun, LuThermometer } from 'react-icons/lu'

import type { WeatherCondition } from '@/whitelabel/types'

import { Props } from './WeatherConditionsCard.types'

const conditionOptions: Array<{
  value: WeatherCondition
  title: string
  description: string
  icon: typeof LuCloudRain
}> = [
  {
    value: 'RAINING',
    title: 'Chuva',
    description: 'Alerta quando previsão de chuva > 70%',
    icon: LuCloudRain,
  },
  {
    value: 'SUNNY',
    title: 'Sol Intenso',
    description: 'Alerta em dias de muito sol (desconto/promoção)',
    icon: LuSun,
  },
  {
    value: 'CLOUDY',
    title: 'Nublado',
    description: 'Alerta quando temperatura > 30°C',
    icon: LuThermometer,
  },
  {
    value: 'COLD',
    title: 'Temperatura Baixa',
    description: 'Alerta quando temperatura < 15°C',
    icon: LuThermometer,
  },
]

function WeatherConditionsCardBase({
  conditions,
  onConditionsChange,
  disabled,
}: Props) {
  const handleConditionToggle = useCallback(
    (condition: WeatherCondition) => {
      if (disabled) return

      if (conditions.includes(condition)) {
        onConditionsChange(conditions.filter((c) => c !== condition))
      } else {
        onConditionsChange([...conditions, condition])
      }
    },
    [conditions, onConditionsChange, disabled]
  )

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Condições Climáticas</Card.Title>
        <Card.Description>
          Selecione as condições que devem disparar alertas
        </Card.Description>
      </Card.Header>
      <Card.Body>
        <Stack gap={4}>
          <SimpleGrid
            columns={{ base: 1, md: 2 }}
            gap={4}
          >
            {conditionOptions.map((option) => {
              const isSelected = conditions.includes(option.value)
              const IconComponent = option.icon
              return (
                <Box
                  key={option.value}
                  as="button"
                  onClick={() => handleConditionToggle(option.value)}
                  disabled={disabled}
                  py={2.5}
                  px={3}
                  borderRadius="md"
                  borderWidth="2px"
                  borderColor={isSelected ? 'primary.500' : 'border.emphasized'}
                  bg={isSelected ? 'primary.50' : 'bg'}
                  _hover={{
                    borderColor: 'primary.400',
                    bg: isSelected ? 'primary.50' : 'bg.muted',
                  }}
                  transition="all 0.2s"
                  cursor={disabled ? 'not-allowed' : 'pointer'}
                  opacity={disabled ? 0.6 : 1}
                  w="full"
                  textAlign="left"
                >
                  <Stack gap={1}>
                    <HStack justify="space-between">
                      <HStack gap={2}>
                        <Icon
                          as={IconComponent}
                          boxSize={5}
                          color={isSelected ? 'primary.500' : 'fg.muted'}
                        />
                        <Text
                          fontWeight="bold"
                          fontSize="md"
                        >
                          {option.title}
                        </Text>
                      </HStack>
                      {isSelected && (
                        <Checkbox.Root checked>
                          <Checkbox.HiddenInput />
                          <Checkbox.Control />
                        </Checkbox.Root>
                      )}
                    </HStack>
                    <Text
                      color="fg.muted"
                      fontSize="sm"
                    >
                      {option.description}
                    </Text>
                  </Stack>
                </Box>
              )
            })}
          </SimpleGrid>
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

const WeatherConditionsCard = memo(
  WeatherConditionsCardBase
) as typeof WeatherConditionsCardBase

export { WeatherConditionsCard, type Props as WeatherConditionsCardProps }
