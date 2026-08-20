import { HStack, RadioGroup, Stack, VStack } from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect, useMemo } from 'react'
import { Controller, FieldErrors, useForm } from 'react-hook-form'
import * as yup from 'yup'

import { AudienceSelect, CustomSendListSelect, Input, SegmentationSelect, WeekdaySelect, toaster } from '@/components'
import { clientTypesOptions } from '@/utils/constants/clientType'
import { WEEKDAYS } from '@/utils/weekdays'

import { DEFAULT_MAX_DAILY_SENDS, MIN_DAILY_SENDS } from '../../constants'
import { maxDailySendsYupField } from '../../maxDailySends.validation'
import { sendScheduleYupFields } from '../../sendSchedule.validation'
import { inferSendScheduleMode } from '../../sendSchedule.utils'
import { SendScheduleFields } from '../../SendScheduleFields'
import { getWizardFormId } from '../../wizardFormId'
import { CardResume } from '../CardResume'
import { FormDataProps, FormStepsProps } from './FormSteps.types'

// Mapeamento de value (1-7) para short ('seg'-'dom')
// Derivado de WEEKDAYS para garantir consistência
const dayMap: { [key: number]: string } = Object.fromEntries(
  WEEKDAYS.map((day) => [day.value, day.short])
)

function buildDetailsSchema(opts: {
  allowPastStartDate: boolean
  /** Na edição a campanha já foi persistida válida; não revalidar janela opcional. */
  skipEndDateIntervalValidation: boolean
}) {
  return yup.object({
    name: yup.string().required('Informe o nome da campanha'),
    targetingMode: yup
      .mixed<'RFV' | 'AUDIENCE' | 'CUSTOMER_LIST'>()
      .oneOf(['RFV', 'AUDIENCE', 'CUSTOMER_LIST'])
      .default('RFV'),
    segmentation: yup.array().when('targetingMode', {
      is: (mode: string) => mode === 'RFV',
      then: (schema) =>
        schema.min(1, 'Informe ao menos 1 segmento').required('Informe os segmentos da campanha'),
      otherwise: (schema) => schema.optional(),
    }),
    audienceId: yup.string().when('targetingMode', {
      is: (mode: string) => mode === 'AUDIENCE',
      then: (schema) => schema.required('Selecione uma audiência'),
      otherwise: (schema) => schema.nullable().optional(),
    }),
    customSendListId: yup.string().when('targetingMode', {
      is: (mode: string) => mode === 'CUSTOMER_LIST',
      then: (schema) => schema.required('Selecione uma lista personalizada'),
      otherwise: (schema) => schema.nullable().optional(),
    }),
    startDate: yup
      .string()
      .required('A data de início é obrigatória')
      .test(
        'is-not-past',
        'A data de início não pode ser no passado',
        (value) => {
          if (opts.allowPastStartDate) return true
          if (!value) return true

          const hoje = new Date()
          const anoHoje = hoje.getFullYear()
          const mesHoje = String(hoje.getMonth() + 1).padStart(2, '0')
          const diaHoje = String(hoje.getDate()).padStart(2, '0')
          const hojeString = `${anoHoje}-${mesHoje}-${diaHoje}`

          return value >= hojeString
        }
      ),
    endDate: yup
      .string()
      .test(
        'is-valid-range',
        'O intervalo deve ser de no mínimo 1 dia e no máximo 30 dias após a data de início',
        (value, { parent }) => {
          if (opts.skipEndDateIntervalValidation) return true

          const { startDate: dataInicio } = parent

          if (!dataInicio || !value) return true

          const inicio = new Date(dataInicio + 'T00:00:00')
          const fim = new Date(value + 'T00:00:00')

          if (fim <= inicio) {
            return false
          }

          const diffTime = Math.abs(fim.getTime() - inicio.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          return diffDays <= 30
        }
      ),
    selectedDays: yup
      .array(yup.number().min(1).max(7))
      .min(1, 'Selecione ao menos um dia da semana para o disparo')
      .required('Informe os dias da semana para o disparo'),
    maxDailySends: maxDailySendsYupField,
    ...sendScheduleYupFields,
  })
}

type FormData = yup.InferType<ReturnType<typeof buildDetailsSchema>>

export function Details(props: FormStepsProps) {
  const isEdit = props.wizardContext === 'edit'
  const schema = useMemo(
    () =>
      buildDetailsSchema({
        allowPastStartDate: isEdit,
        skipEndDateIntervalValidation: isEdit,
      }),
    [isEdit]
  )

  const defaultValues = useMemo(
    () => ({
      name: props.formData?.name || '',
      targetingMode: props.formData?.targetingMode ?? 'RFV',
      audienceId: props.formData?.audienceId ?? null,
      customSendListId: props.formData?.customSendListId ?? null,
      segmentation:
        props.formData?.segmentation?.length &&
        Array.isArray(props.formData.segmentation)
          ? props.formData.segmentation
          : props.formData?.target || [],
      startDate: props.formData?.startDate || '',
      endDate: props.formData?.endDate || '',
      selectedDays: props.formData?.selectedDays ?? [1, 2, 3, 4, 5, 6, 7],
      maxDailySends: props.formData?.maxDailySends ?? DEFAULT_MAX_DAILY_SENDS,
      sendScheduleMode:
        props.formData?.sendScheduleMode ??
        inferSendScheduleMode(
          props.formData?.sendTimeStart,
          props.formData?.sendTimeEnd,
        ),
      sendTimeStart: props.formData?.sendTimeStart ?? '',
      sendTimeEnd: props.formData?.sendTimeEnd ?? '',
    }),
    [props.formData],
  )

  const { handleSubmit, control, watch, register, reset, setValue } =
    useForm<FormData>({
      mode: 'onChange',
      resolver: yupResolver<FormData, any, any>(schema),
      defaultValues,
      shouldUnregister: true,
    })

  useEffect(() => {
    reset(defaultValues)
  }, [defaultValues, reset])

  const segmentationValue = watch('segmentation')
  const targetingModeValue = watch('targetingMode')
  const audienceIdValue = watch('audienceId')
  const customSendListIdValue = watch('customSendListId')
  const maxDailySendsValue = watch('maxDailySends')
  const startDateValue = watch('startDate')
  const endDateValue = watch('endDate')
  const sendScheduleModeValue = watch('sendScheduleMode')
  const sendTimeStartValue = watch('sendTimeStart')
  const sendTimeEndValue = watch('sendTimeEnd')

  const onInvalid = (errors: FieldErrors<FormData>) => {
    const firstError = Object.values(errors).find(
      (entry) => entry && typeof entry === 'object' && 'message' in entry,
    )
    toaster.create({
      title: 'Não foi possível avançar',
      description:
        (firstError?.message as string | undefined) ??
        'Verifique os campos obrigatórios do passo Detalhes.',
      type: 'error',
      closable: true,
      duration: 4000,
    })
  }

  const onSubmit = (formValues: FormData) => {
    const daysOfWeek = formValues.selectedDays
      .map((dayNumber) => (dayNumber ? dayMap[dayNumber] : undefined))
      .filter((d): d is string => Boolean(d))

    const scheduleMode = formValues.sendScheduleMode ?? 'establishment'

    props.onSubmit?.({
      ...formValues,
      daysOfWeek,
      sendScheduleMode: scheduleMode,
      sendTimeStart:
        scheduleMode === 'establishment' ? null : formValues.sendTimeStart || null,
      sendTimeEnd:
        scheduleMode === 'range' ? formValues.sendTimeEnd || null : null,
    } as FormDataProps)
  }

  return (
    <VStack
      align="stretch"
      gap={4}
    >
      <CardResume
        formData={{
          name: '',
          segmentation: segmentationValue,
          targetingMode: targetingModeValue,
          audienceId: audienceIdValue,
          customSendListId: customSendListIdValue,
          startDate: startDateValue ?? '',
          endDate: endDateValue?.trim() ? endDateValue : null,
          campaignType: props.formData?.campaignType || 'REACTIVATION',
          messageText: props.formData?.messageText || '',
          deliveryRadius: props.formData?.deliveryRadius ?? 0,
          discountCurrency: props.formData?.discountCurrency ?? 0,
          discountPercent: props.formData?.discountPercent ?? 0,
          selectedDays: props.formData?.selectedDays ?? [1, 2, 3, 4, 5, 6, 7],
          images: props.formData?.images ?? (undefined as any as FileList),
          imagesBase64: props.formData?.imagesBase64 ?? [],
          incitation: props.formData?.incitation ?? 'none',
          daysOfWeek: props.formData?.daysOfWeek ?? [],
          target: segmentationValue,
          maxDailySends: maxDailySendsValue,
          sendScheduleMode: sendScheduleModeValue ?? 'establishment',
          sendTimeStart: sendTimeStartValue || null,
          sendTimeEnd: sendTimeEndValue || null,
        }}
        id={(props.id ?? 0) + 1}
      />
      <Stack
        as="form"
        gap={4}
        id={getWizardFormId(props.wizardFormId ?? 'campaign', props.id ?? 0)}
        noValidate
        onSubmit={handleSubmit(onSubmit, onInvalid)}
      >
        <Controller
          control={control}
          name="targetingMode"
          render={({ field }) => (
            <RadioGroup.Root
              onValueChange={({ value }) => {
                field.onChange(value)
                if (value === 'AUDIENCE') {
                  setValue('segmentation', [], { shouldValidate: true })
                  setValue('customSendListId', null, { shouldValidate: true })
                } else if (value === 'CUSTOMER_LIST') {
                  setValue('segmentation', [], { shouldValidate: true })
                  setValue('audienceId', null, { shouldValidate: true })
                } else {
                  setValue('audienceId', null, { shouldValidate: true })
                  setValue('customSendListId', null, { shouldValidate: true })
                }
              }}
              value={field.value}
            >
              <HStack gap={6}>
                <RadioGroup.Item value="RFV">
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemIndicator />
                  <RadioGroup.ItemText>Segmentação RFV</RadioGroup.ItemText>
                </RadioGroup.Item>
                <RadioGroup.Item value="AUDIENCE">
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemIndicator />
                  <RadioGroup.ItemText>Audiência customizada</RadioGroup.ItemText>
                </RadioGroup.Item>
                <RadioGroup.Item value="CUSTOMER_LIST">
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemIndicator />
                  <RadioGroup.ItemText>Lista personalizada</RadioGroup.ItemText>
                </RadioGroup.Item>
              </HStack>
            </RadioGroup.Root>
          )}
        />

        {targetingModeValue === 'RFV' ? (
          <SegmentationSelect
            collection={clientTypesOptions}
            control={control}
            label="Segmentação RFV"
            multiple
            name="segmentation"
            placeholder="Selecione os tipos de clientes"
            required
          />
        ) : targetingModeValue === 'AUDIENCE' ? (
          <AudienceSelect
            control={control}
            label="Audiência"
            name="audienceId"
            required
          />
        ) : (
          <CustomSendListSelect
            control={control}
            label="Lista personalizada"
            name="customSendListId"
            required
          />
        )}
        <Input
          control={control}
          label="Nome da campanha"
          name="name"
          placeholder="Informe o Nome da campanha"
          required
        />
        <HStack alignItems="flex-start">
          <Input
            control={control}
            label="Data início"
            name="startDate"
            required
            type="date"
          />
          <Input
            control={control}
            label="Data fim"
            name="endDate"
            type="date"
          />
        </HStack>
        <Input
          control={control}
          label="Limite máximo de envios por dia"
          min={MIN_DAILY_SENDS}
          name="maxDailySends"
          placeholder="Informe a quantidade (número inteiro)"
          required
          type="number"
        />
        <SendScheduleFields
          control={control}
          register={register}
        />
        <WeekdaySelect
          control={control}
          label="Dias da semana para campanha"
          name="selectedDays"
          required
        />
      </Stack>
    </VStack>
  )
}
