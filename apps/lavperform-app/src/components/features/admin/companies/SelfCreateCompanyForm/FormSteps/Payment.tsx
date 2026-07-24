import { Fieldset, Flex, Stack, Text } from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { memo, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { Input } from '@/components'

import { FormDataPayment, schemaPayment } from '../schema'
import { FormStepsProps } from './FormSteps.types'

function buildPaymentDefaultValues(
  formData?: FormStepsProps['formData']
): FormDataPayment {
  return {
    creditCard: {
      holderName: formData?.name ?? '',
      number: '',
      expiryMonth: '',
      expiryYear: '',
      ccv: '',
    },
  }
}

function PaymentComponent(props: FormStepsProps) {
  const defaultValues = useMemo(
    () => buildPaymentDefaultValues(props.formData),
    [props.formData]
  )

  const { control, handleSubmit } = useForm<FormDataPayment>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: yupResolver<FormDataPayment, any, any>(schemaPayment),
    defaultValues,
  })

  const onSubmit = useCallback(
    async (data: FormDataPayment) => {
      props.onSubmit?.(data)
    },
    [props]
  )

  return (
    <Stack
      as="form"
      gap={6}
      id={`hook-form-${props.id}`}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Fieldset.Root>
        <Fieldset.Content>
          <Fieldset.Legend mb={4}>
            <Text fontSize="md">Dados do Cartão de Crédito</Text>
          </Fieldset.Legend>
          <Input
            control={control}
            label="Nome do Titular no Cartão"
            name="creditCard.holderName"
            placeholder="Ex: João M. Silva"
            required
          />
          <Input
            control={control}
            label="Número do Cartão"
            maxLength={19}
            name="creditCard.number"
            placeholder="0000 0000 0000 0000"
            required
          />
          <Flex gap={2}>
            <Input
              control={control}
              label="Mês (MM)"
              maxLength={2}
              name="creditCard.expiryMonth"
              placeholder="MM"
              required
              w="90%"
            />
            <Input
              control={control}
              label="Ano (AA)"
              maxLength={2}
              name="creditCard.expiryYear"
              placeholder="AA"
              required
              w="90%"
            />
            <Input
              control={control}
              label="CVV"
              maxLength={4}
              name="creditCard.ccv"
              placeholder="Ex: 123"
              required
              w="90%"
            />
          </Flex>
        </Fieldset.Content>
      </Fieldset.Root>
    </Stack>
  )
}

const Payment = memo(PaymentComponent)

export { Payment, buildPaymentDefaultValues }
