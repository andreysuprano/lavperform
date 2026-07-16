import { Box, Field, HStack, Text } from '@chakra-ui/react'
import { FieldValues, useController } from 'react-hook-form'

import { useWhiteLabel } from '@/config'
import { WEEKDAYS } from '@/utils/weekdays'

import { Props } from './WeekdaySelect.types'

function WeekdaySelect<T extends FieldValues>({
  name,
  control,
  label,
  required = false,
}: Props<T>) {
  const { colorPalette } = useWhiteLabel()

  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    name,
    control,
    rules: {
      required: required ? 'Selecione ao menos um dia da semana' : undefined,
    },
  })

  const selectedDays: number[] = Array.isArray(value) ? value : []

  const handleToggleDay = (dayValue: number) => {
    const isSelected = selectedDays.includes(dayValue)

    if (isSelected) {
      const newSelection = selectedDays.filter((v) => v !== dayValue)
      onChange(newSelection)
    } else {
      const newSelection = [...selectedDays, dayValue].sort((a, b) => a - b)
      onChange(newSelection)
    }
  }

  return (
    <Field.Root
      invalid={!!error}
      mb={4}
      required
    >
      {label && (
        <Field.Label>
          {label} <Field.RequiredIndicator />
        </Field.Label>
      )}
      <HStack
        gap={2}
        wrap="wrap"
      >
        {WEEKDAYS.map((day) => {
          const isSelected = selectedDays.includes(day.value)

          const commonStyles = {
            width: '45px',
            height: '45px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'sm',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontWeight: 'bold',
            'aria-checked': isSelected,
            border: '1px solid',
            borderColor: isSelected ? `${colorPalette}.400` : 'bg.inverted',
            _hover: {
              bg: isSelected ? `${colorPalette}.200` : 'bg.muted',
            },
          }

          const selectedStyles = {
            bg: `${colorPalette}.300`,
            color: 'gray.900',
          }

          const unselectedStyles = {
            bg: 'none',
            color: 'fg',
          }

          const currentStyles = isSelected
            ? { ...commonStyles, ...selectedStyles }
            : { ...commonStyles, ...unselectedStyles }

          return (
            <Box
              key={day.value}
              role="checkbox"
              {...currentStyles}
              onClick={() => handleToggleDay(day.value)}
              title={
                isSelected ? 'Clique para desativar' : 'Clique para ativar'
              }
            >
              <Text fontSize="sm">{day.label}</Text>
            </Box>
          )
        })}
      </HStack>
      {!!error && <Field.ErrorText>{error.message}</Field.ErrorText>}
    </Field.Root>
  )
}

export { WeekdaySelect, type Props as WeekdaySelectProps }
