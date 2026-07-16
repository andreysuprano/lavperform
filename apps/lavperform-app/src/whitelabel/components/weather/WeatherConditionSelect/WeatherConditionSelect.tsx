import {
  Box,
  Field,
  HStack,
  Icon,
  RadioGroup,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react'
import { FieldValues, useController } from 'react-hook-form'
import {
  LuCloud,
  LuCloudRain,
  LuSnowflake,
  LuSun,
} from 'react-icons/lu'

import type { WeatherConditionAPI } from '@/whitelabel/types'

import { Props } from './WeatherConditionSelect.types'

const conditionOptions: Array<{
  value: WeatherConditionAPI
  title: string
  description: string
  icon: typeof LuCloudRain
}> = [
  {
    value: 'RAINING',
    title: 'Chuva',
    description: 'Alerta quando houver previsão de chuva',
    icon: LuCloudRain,
  },
  {
    value: 'SUNNY',
    title: 'Sol Intenso',
    description: 'Alerta em dias de muito sol',
    icon: LuSun,
  },
  {
    value: 'CLOUDY',
    title: 'Nublado',
    description: 'Alerta quando estiver nublado',
    icon: LuCloud,
  },
  {
    value: 'COLD',
    title: 'Temperatura Baixa',
    description: 'Alerta quando temperatura estiver baixa',
    icon: LuSnowflake,
  },
]

function WeatherConditionSelect<T extends FieldValues>({
  name,
  control,
  label,
  required = false,
  disabled = false,
}: Props<T>) {
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    name,
    control,
    rules: {
      required: required ? 'Selecione uma condição climática' : undefined,
    },
  })

  return (
    <Field.Root
      invalid={!!error}
      required={required}
    >
      {label && (
        <Field.Label>
          {label} {required && <Field.RequiredIndicator />}
        </Field.Label>
      )}

      <RadioGroup.Root
        disabled={disabled}
        onValueChange={(details) => onChange(details.value)}
        value={value}
      >
        <SimpleGrid
          columns={{ base: 1, md: 2, lg: 2, xl: 4 }}
          gap={4}
          w="full"
        >
          {conditionOptions.map((option) => {
            const isSelected = value === option.value
            const IconComponent = option.icon

            return (
              <RadioGroup.Item
                key={option.value}
                value={option.value}
                asChild
              >
                <Box
                  as="label"
                  borderColor={isSelected ? 'black' : 'border.emphasized'}
                  borderRadius="md"
                  borderWidth="2px"
                  bg="bg"
                  cursor={disabled ? 'not-allowed' : 'pointer'}
                  opacity={disabled ? 0.6 : isSelected ? 1 : 0.5}
                  px={4}
                  py={3}
                  textAlign="left"
                  transition="all 0.2s"
                  w="full"
                  _hover={{
                    opacity: disabled ? 0.6 : isSelected ? 1 : 0.7,
                  }}
                  _dark={{
                    borderColor: isSelected ? 'white' : 'border.emphasized',
                  }}
                >
                  <RadioGroup.ItemHiddenInput />
                  <Stack gap={2}>
                    <HStack gap={2}>
                      <Icon
                        as={IconComponent}
                        boxSize={5}
                        color="fg"
                      />
                      <Text
                        fontSize="md"
                        fontWeight="semibold"
                        color="fg"
                      >
                        {option.title}
                      </Text>
                    </HStack>
                    <Text
                      color="fg.muted"
                      fontSize="sm"
                    >
                      {option.description}
                    </Text>
                  </Stack>
                </Box>
              </RadioGroup.Item>
            )
          })}
        </SimpleGrid>
      </RadioGroup.Root>

      {!!error && <Field.ErrorText>{error.message}</Field.ErrorText>}
    </Field.Root>
  )
}

export { WeatherConditionSelect, type Props as WeatherConditionSelectProps }
