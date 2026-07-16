import { Box, Field, HStack, RadioGroup, Stack, Text } from '@chakra-ui/react'
import { Control, Controller, UseFormRegister, useWatch } from 'react-hook-form'

import { Input } from '@/components'

import {
  SEND_SCHEDULE_MODE_OPTIONS,
  SendScheduleMode,
} from '../sendSchedule.utils'

type SendScheduleFieldsProps = {
  control: Control<any>
  register: UseFormRegister<any>
}

export function SendScheduleFields({
  control,
  register,
}: SendScheduleFieldsProps) {
  const sendScheduleMode = useWatch({
    control,
    name: 'sendScheduleMode',
  }) as SendScheduleMode | undefined

  return (
    <Field.Root>
      <Field.Label>Horário de envio</Field.Label>

      <Controller
        control={control}
        name="sendScheduleMode"
        render={({ field, fieldState }) => (
          <Stack gap={2}>
            <RadioGroup.Root
              onValueChange={(details) => field.onChange(details.value)}
              value={field.value ?? 'establishment'}
            >
              <Stack gap={2}>
                {SEND_SCHEDULE_MODE_OPTIONS.map((option) => {
                  const isSelected =
                    (field.value ?? 'establishment') === option.value

                  return (
                    <RadioGroup.Item
                      key={option.value}
                      asChild
                      value={option.value}
                    >
                      <Box
                        as="label"
                        bg="bg"
                        borderColor={
                          isSelected ? 'fg' : 'border.emphasized'
                        }
                        borderRadius="md"
                        borderWidth="2px"
                        cursor="pointer"
                        opacity={isSelected ? 1 : 0.72}
                        px={4}
                        py={3}
                        transition="all 0.2s"
                        w="full"
                        _hover={{ opacity: isSelected ? 1 : 0.85 }}
                      >
                        <RadioGroup.ItemHiddenInput />
                        <Stack gap={1}>
                          <Text fontWeight="semibold">{option.label}</Text>
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
              </Stack>
            </RadioGroup.Root>

            {fieldState.error?.message && (
              <Field.ErrorText>{fieldState.error.message}</Field.ErrorText>
            )}
          </Stack>
        )}
      />

      {sendScheduleMode === 'fixed' && (
        <Input
          control={control}
          label="Horário fixo"
          name="sendTimeStart"
          required
          type="time"
          {...register('sendTimeStart')}
        />
      )}

      {sendScheduleMode === 'range' && (
        <HStack
          alignItems="flex-start"
          mt={2}
        >
          <Input
            control={control}
            label="Início"
            name="sendTimeStart"
            required
            type="time"
            {...register('sendTimeStart')}
          />
          <Input
            control={control}
            label="Fim"
            name="sendTimeEnd"
            required
            type="time"
            {...register('sendTimeEnd')}
          />
        </HStack>
      )}
    </Field.Root>
  )
}
