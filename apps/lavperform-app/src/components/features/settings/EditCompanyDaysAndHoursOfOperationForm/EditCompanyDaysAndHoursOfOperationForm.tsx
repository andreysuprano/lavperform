import { Box, Button, Fieldset, HStack, Stack, Switch } from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { RiEditLine, RiSaveLine } from 'react-icons/ri'

import { CustomDrawer, Input } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { scheduleService } from '@/services'
import type { CompanyOpeningHour } from '@/types'
import { logger } from '@/utils/logger'
import { WEEKDAYS } from '@/utils/weekdays'

import type {
  Props,
  ScheduleData,
} from './EditCompanyDaysAndHoursOfOperationForm.types'
import { type FormData, schema } from './schema'

const getDefaultSchedule = (): CompanyOpeningHour[] =>
  WEEKDAYS.map((day) => ({
    dayOfWeek: day.short,
    isOpen: true,
    openTime: '18:00',
    closeTime: '22:30',
  }))

export function EditCompanyDaysAndHoursOfOperationForm({
  schedule,
  onClose,
  onSuccess,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const { selectedCompany } = useAuth()

  const {
    formState: { isSubmitting },
    control,
    handleSubmit,
    register,
  } = useForm<FormData>({
    mode: 'onChange',
    resolver: yupResolver(schema) as any,
    defaultValues: {
      operatingDays:
        schedule.operatingDays.length > 0
          ? schedule.operatingDays
          : getDefaultSchedule(),
    },
  })

  const { fields } = useFieldArray({
    control,
    name: 'operatingDays',
  })

  const watchedDays = useWatch({ control, name: 'operatingDays' })

  const handleSave = async (values: FormData) => {
    if (!selectedCompany?.id || !values?.operatingDays) return

    try {
      const openingHours: CompanyOpeningHour[] = values.operatingDays
        .filter((day) => day.openTime && day.closeTime)
        .map((day) => ({
          dayOfWeek: day.dayOfWeek,
          isOpen: day.isOpen,
          openTime: day.openTime!,
          closeTime: day.closeTime!,
        }))

      await scheduleService.saveOpeningHours(selectedCompany.id, {
        openingHours,
      })

      await onSuccess(values as ScheduleData)

      handleClose()
    } catch (error) {
      logger.error('Erro ao salvar horários:', error)
    }
  }

  function handleClose() {
    onClose()
    setIsOpen(false)
  }

  return (
    <CustomDrawer
      footer={
        <Button
          form="schedule-form"
          loading={isSubmitting}
          type="submit"
        >
          <RiSaveLine />
          Salvar
        </Button>
      }
      isOpen={isOpen}
      onExitComplete={handleClose}
      size="sm"
      title="Editar Horários de Funcionamento"
      trigger={
        <Button
          onClick={() => setIsOpen(true)}
          size="xs"
        >
          <RiEditLine />
          Editar
        </Button>
      }
    >
      <Stack
        as="form"
        id="schedule-form"
        onSubmit={handleSubmit(handleSave)}
      >
        <Fieldset.Root>
          <Fieldset.Content>
            {fields.map((field, index) => {
              const isDayOpen = watchedDays?.[index]?.isOpen ?? true

              return (
                <HStack
                  alignItems="center"
                  bg={
                    isDayOpen
                      ? { base: 'gray.50', _dark: 'gray.900' }
                      : { base: 'red.50', _dark: 'red.950' }
                  }
                  borderColor={
                    isDayOpen
                      ? { base: 'gray.200', _dark: 'gray.700' }
                      : { base: 'red.300', _dark: 'red.700' }
                  }
                  borderRadius="md"
                  borderWidth={2}
                  gap={2}
                  key={field.id}
                  p={2}
                >
                  <Controller
                    control={control}
                    name={`operatingDays.${index}.isOpen`}
                    render={({ field }) => (
                      <Switch.Root
                        alignItems="center"
                        checked={field.value}
                        display="flex"
                        flexDirection="column"
                        gap={3}
                        justifyContent="center"
                        minW={100}
                        onCheckedChange={({ checked }) =>
                          field.onChange(checked)
                        }
                        size="lg"
                      >
                        <Switch.Label
                          fontSize="lg"
                          textTransform="capitalize"
                        >
                          {fields[index].dayOfWeek}
                        </Switch.Label>
                        <Switch.HiddenInput />
                        <Switch.Control />
                      </Switch.Root>
                    )}
                  />
                  <Box flex={1}>
                    <Input
                      control={control}
                      disabled={!isDayOpen}
                      id={`operatingDays.${index}.openTime`}
                      label="Início"
                      type="time"
                      {...register(`operatingDays.${index}.openTime`)}
                    />
                  </Box>
                  <Box flex={1}>
                    <Input
                      control={control}
                      disabled={!isDayOpen}
                      id={`operatingDays.${index}.closeTime`}
                      label="Fim"
                      type="time"
                      {...register(`operatingDays.${index}.closeTime`)}
                    />
                  </Box>
                </HStack>
              )
            })}
          </Fieldset.Content>
        </Fieldset.Root>
      </Stack>
    </CustomDrawer>
  )
}
