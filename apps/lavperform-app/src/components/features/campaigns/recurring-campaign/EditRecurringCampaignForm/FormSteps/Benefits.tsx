import {
  Box,
  Card,
  Field,
  HStack,
  Icon,
  Input,
  InputGroup,
  RadioCard,
  Slider,
  Stack,
  Text,
} from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import * as yup from 'yup'

import { getBusinessCopy, useWhiteLabel } from '@/config'

import { discountTypeItems, incitationItems } from '../../constants'
import { FormStepsProps } from './FormSteps.types'

const copy = getBusinessCopy()

const schema = yup.object().shape({
  incitation: yup
    .string()
    .required('O campo "Incentivo" é obrigatório')
    .oneOf(
      ['tax', 'discount', 'none'],
      `O valor de "Incentivo" deve ser "${copy.freeShippingTitle}" ou "Desconto"`
    ),
  deliveryRadius: yup
    .number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .when('incitation', {
      is: 'tax',
      then: (schema) =>
        schema
          .required(
            `O "${copy.deliveryRadiusLabel}" é obrigatório quando "Incentivo" é "${copy.freeShippingTitle}"`
          )
          .min(1, `O valor mínimo para o "${copy.deliveryRadiusLabel}" é 1`),
    }),
  discountType: yup.string().when('incitation', {
    is: 'discount',
    then: (schema) =>
      schema
        .required(
          'O "Tipo de desconto" é obrigatório quando "Incentivo" é "Desconto"'
        )
        .oneOf(
          ['percent', 'currency'],
          'O valor de "Tipo de desconto" deve ser "Porcentagem" ou "Valor fixo"'
        ),
  }),
  discountPercent: yup
    .number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .when('discountType', {
      is: 'percent',
      then: (schema) =>
        schema
          .required(
            'A "Porcentagem" é obrigatória quando "Tipo de desconto" é "Porcentagem"'
          )
          .min(1, 'O valor mínimo para "Porcentagem" é 1')
          .max(100, 'A "Porcentagem" não pode ser maior que 100'),
    }),
  discountCurrency: yup
    .number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .when('discountType', {
      is: 'currency',
      then: (schema) =>
        schema
          .required(
            'O "Valor fixo" é obrigatória quando "Tipo de desconto" é "Valor fixo"'
          )
          .min(1, 'O valor mínimo para "Valor fixo" é 1'),
    }),
})

type FormData = yup.InferType<typeof schema>

export function Benefits(props: FormStepsProps) {
  const { colors, theme } = useWhiteLabel()
  const hasDelivery = theme.features.hasDelivery

  const activeSchema = useMemo(
    () =>
      hasDelivery
        ? schema
        : schema.shape({
            incitation: yup
              .string()
              .required('O campo "Incentivo" é obrigatório')
              .oneOf(['discount', 'none'], 'Selecione um tipo de incentivo válido'),
          }),
    [hasDelivery]
  )

  const filteredIncitationItems = useMemo(
    () =>
      !hasDelivery
        ? incitationItems.filter((item) => item.value !== 'tax')
        : incitationItems,
    [hasDelivery]
  )

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    mode: 'onChange',
    resolver: yupResolver<FormData, any, any>(activeSchema),
    values: {
      incitation: props.formData?.incitation || '',
      deliveryRadius: props.formData?.deliveryRadius
        ? Number(props.formData.deliveryRadius)
        : undefined,
      discountPercent: props.formData?.discountPercent
        ? Number(props.formData.discountPercent)
        : undefined,
      discountCurrency: props.formData?.discountCurrency
        ? Number(props.formData.discountCurrency)
        : undefined,
      discountType: props.formData?.discountType || '',
    },
  })

  const incitationValue = watch('incitation')
  const discountTypeValue = watch('discountType')

  useEffect(() => {
    if (!hasDelivery && incitationValue === 'tax') {
      setValue('incitation', '')
      setValue('deliveryRadius', undefined)
    }
  }, [hasDelivery, incitationValue, setValue])

  const handleIncitationChange = (value: string | null) => {
    if (!value) return

    setValue('incitation', value)

    if (value === 'tax') {
      setValue('discountType', '')
      setValue('discountPercent', undefined)
      setValue('discountCurrency', undefined)
    } else if (value === 'discount') {
      setValue('deliveryRadius', undefined)
      setValue('discountType', '')
      setValue('discountPercent', undefined)
      setValue('discountCurrency', undefined)
    } else if (value === 'none') {
      setValue('deliveryRadius', undefined)
      setValue('discountType', '')
      setValue('discountPercent', undefined)
      setValue('discountCurrency', undefined)
    }
  }

  const handleDiscountTypeChange = (value: string | null) => {
    if (!value) return

    setValue('discountType', value)

    if (value === 'percent') {
      setValue('discountCurrency', undefined)
    } else if (value === 'currency') {
      setValue('discountPercent', undefined)
    }
  }

  const onSubmit = (data: FormData) => {
    let cleanData = { ...data }

    if (incitationValue === 'tax') {
      cleanData = {
        ...cleanData,
        discountType: '',
        discountPercent: 0,
        discountCurrency: 0,
      }
    }

    if (incitationValue === 'discount') {
      cleanData = {
        ...cleanData,
        deliveryRadius: 0,
        discountPercent:
          discountTypeValue === 'percent' ? data.discountPercent || 0 : 0,
        discountCurrency:
          discountTypeValue === 'currency' ? data.discountCurrency || 0 : 0,
      }
    }

    if (incitationValue === 'none') {
      cleanData = {
        incitation: 'none',
        discountType: '',
        discountPercent: 0,
        discountCurrency: 0,
        deliveryRadius: 0,
      }
    }

    props.onSubmit?.(cleanData as any)
  }

  return (
    <Stack
      as="form"
      gap={4}
      id={`hook-form-${props.id}`}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Controller
        control={control}
        name="incitation"
        render={({ field }) => (
          <Field.Root
            cursor="pointer"
            invalid={!!errors.incitation}
          >
            <RadioCard.Root
              name={field.name}
              onValueChange={({ value }) => handleIncitationChange(value)}
              value={field.value}
              w="full"
            >
              <RadioCard.Label>Tipo de incentivo:</RadioCard.Label>
              <HStack align="stretch">
                {filteredIncitationItems.map((item) => (
                  <RadioCard.Item
                    _hover={{
                      bg: 'bg',
                      cursor: 'pointer',
                      borderColor: colors.primary,
                    }}
                    key={item.value}
                    value={item.value}
                  >
                    <RadioCard.ItemHiddenInput />
                    <RadioCard.ItemControl>
                      <Icon
                        color="fg.subtle"
                        fontSize="2xl"
                      >
                        {item.icon}
                      </Icon>
                      <RadioCard.ItemContent>
                        <RadioCard.ItemText>{item.title}</RadioCard.ItemText>
                        <RadioCard.ItemDescription>
                          {item.description}
                        </RadioCard.ItemDescription>
                      </RadioCard.ItemContent>
                      <RadioCard.ItemIndicator />
                    </RadioCard.ItemControl>
                  </RadioCard.Item>
                ))}
              </HStack>
            </RadioCard.Root>
            {!!errors?.incitation && (
              <Field.ErrorText>{errors?.incitation.message}</Field.ErrorText>
            )}
          </Field.Root>
        )}
      />
      {incitationValue === 'discount' && (
        <Controller
          control={control}
          name="discountType"
          render={({ field }) => (
            <Field.Root
              cursor="pointer"
              invalid={!!errors.discountType}
            >
              <RadioCard.Root
                name={field.name}
                onValueChange={({ value }) => handleDiscountTypeChange(value)}
                value={field.value}
                w="full"
              >
                <RadioCard.Label>Tipo de desconto:</RadioCard.Label>
                <HStack align="stretch">
                  {discountTypeItems.map((item) => (
                    <RadioCard.Item
                      _hover={{
                        bg: 'bg',
                        cursor: 'pointer',
                        borderColor: colors.primary,
                      }}
                      key={item.value}
                      value={item.value}
                    >
                      <RadioCard.ItemHiddenInput />
                      <RadioCard.ItemControl alignItems="center">
                        <Icon
                          color="fg.subtle"
                          fontSize="2xl"
                        >
                          {item.icon}
                        </Icon>
                        <RadioCard.ItemContent>
                          <RadioCard.ItemText>{item.title}</RadioCard.ItemText>
                        </RadioCard.ItemContent>
                        <RadioCard.ItemIndicator />
                      </RadioCard.ItemControl>
                    </RadioCard.Item>
                  ))}
                </HStack>
              </RadioCard.Root>
              {!!errors?.discountType && (
                <Field.ErrorText>
                  {errors?.discountType.message}
                </Field.ErrorText>
              )}
            </Field.Root>
          )}
        />
      )}
      {incitationValue === 'tax' && hasDelivery && (
        <Controller
          control={control}
          name="deliveryRadius"
          render={({ field }) => (
            <Field.Root invalid={!!errors.deliveryRadius}>
              <Card.Root
                size="sm"
                w={'100%'}
              >
                <Card.Body>
                  <Slider.Root
                    max={20}
                    name={field.name}
                    onValueChange={({ value }) => field.onChange(value[0])}
                    value={[field.value || 0]}
                  >
                    <HStack justify="space-between">
                      <Slider.Label>{copy.deliveryRadiusLabel}</Slider.Label>
                      <Box>
                        <Slider.ValueText />
                        {' Km'}
                      </Box>
                    </HStack>
                    <Slider.Control>
                      <Slider.Track>
                        <Slider.Range />
                      </Slider.Track>
                      <Slider.Thumbs />
                    </Slider.Control>
                  </Slider.Root>

                  {!!errors.deliveryRadius && (
                    <Field.ErrorText mt={2}>
                      {errors?.deliveryRadius.message}
                    </Field.ErrorText>
                  )}
                </Card.Body>
              </Card.Root>
            </Field.Root>
          )}
        />
      )}
      {incitationValue === 'discount' && discountTypeValue === 'currency' && (
        <Controller
          control={control}
          name="discountCurrency"
          render={({ field }) => (
            <Card.Root
              maxW={'50%'}
              size="sm"
            >
              <Card.Body>
                <Text
                  fontWeight={500}
                  mb={2}
                >
                  Valor de desconto:
                </Text>
                <Field.Root
                  invalid={!!errors.discountCurrency}
                  w="full"
                >
                  <InputGroup
                    endAddon=",00"
                    startAddon="R$"
                  >
                    <Input
                      min={0}
                      textAlign="end"
                      type="number"
                      {...field}
                      name={field.name}
                    />
                  </InputGroup>
                  {!!errors.discountCurrency && (
                    <Field.ErrorText>
                      {errors?.discountCurrency.message}
                    </Field.ErrorText>
                  )}
                </Field.Root>
              </Card.Body>
            </Card.Root>
          )}
        />
      )}
      {incitationValue === 'discount' && discountTypeValue === 'percent' && (
        <Controller
          control={control}
          name="discountPercent"
          render={({ field }) => (
            <Card.Root
              maxW={'50%'}
              size="sm"
            >
              <Card.Body>
                <Text
                  fontWeight={500}
                  mb={2}
                >
                  Porcentagem de desconto:
                </Text>
                <Field.Root
                  invalid={!!errors.discountPercent}
                  w="full"
                >
                  <InputGroup endAddon="%">
                    <Input
                      max={100}
                      min={0}
                      textAlign="end"
                      type="number"
                      {...field}
                      name={field.name}
                    />
                  </InputGroup>
                  {!!errors.discountPercent && (
                    <Field.ErrorText>
                      {errors?.discountPercent.message}
                    </Field.ErrorText>
                  )}
                </Field.Root>
              </Card.Body>
            </Card.Root>
          )}
        />
      )}
    </Stack>
  )
}
