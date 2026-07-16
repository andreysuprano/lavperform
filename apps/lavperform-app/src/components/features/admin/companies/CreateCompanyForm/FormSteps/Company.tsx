import { Box, Fieldset, HStack, Stack } from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { memo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useHookFormMask } from 'use-mask-input'

import { Input, Row, Select } from '@/components'
import { cepService } from '@/services/cep.service'
import { ufList } from '@/utils/constants/uf'

import { FormDataCompany, schemaCompany } from '../schema'
import { FormStepsProps } from './FormSteps.types'

function CompanyComponent(props: FormStepsProps) {
  const { register, control, handleSubmit, watch, setValue } =
    useForm<FormDataCompany>({
      mode: 'onChange',
      resolver: yupResolver<FormDataCompany, any, any>(schemaCompany),
      defaultValues: {
        company: {
          city: '',
          cnpj: '',
          complement: '',
          email: '',
          name: '',
          neighborhood: '',
          number: '',
          phone: '',
          state: '',
          street: '',
          zipCode: '',
        },
      },
      values: {
        company: {
          city: props.formData?.company?.city || '',
          cnpj: props.formData?.company?.cnpj || '',
          complement: props.formData?.company?.complement || '',
          email: props.formData?.company?.email || '',
          name: props.formData?.company?.name || '',
          neighborhood: props.formData?.company?.neighborhood || '',
          number: props.formData?.company?.number || '',
          phone: props.formData?.company?.phone || '',
          state: props.formData?.company?.state || '',
          street: props.formData?.company?.street || '',
          zipCode: props.formData?.company?.zipCode || '',
        },
      },
    })

  const maskedRegister = useHookFormMask(register)
  const zipCode = watch('company.zipCode')

  useEffect(() => {
    const fetchAddress = async () => {
      if (!zipCode || zipCode.length !== 9) {
        return
      }

      const cleanCep = zipCode.replace(/\D/g, '')
      if (cleanCep.length !== 8) {
        return
      }

      try {
        const addressData = await cepService.getAddressByCep(zipCode)

        setValue('company.street', addressData.street)
        setValue('company.neighborhood', addressData.neighborhood)
        setValue('company.city', addressData.city)
        setValue('company.state', addressData.state)
      } catch (error) {
        console.error('Error fetching address:', error)
      }
    }

    fetchAddress()
  }, [zipCode, setValue])

  const onSubmit = async (data: any) => {
    props.onSubmit?.(data)
  }

  return (
    <Stack
      as="form"
      gap={4}
      id={`hook-form-${props.id}`}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Fieldset.Root>
        <Fieldset.Content>
          <Input
            control={control}
            label="Nome da empresa"
            placeholder="Informe o nome da empresa"
            required
            {...register('company.name')}
          />
          <Row>
            <Input
              control={control}
              label="CNPJ"
              placeholder="99.999.999/9999-99"
              required
              {...maskedRegister('company.cnpj', '99.999.999/9999-99')}
            />
            <Input
              control={control}
              label="Telefone da empresa"
              placeholder="(99) 99999-9999"
              required
              type="tel"
              {...maskedRegister('company.phone', '(99) 99999-9999')}
            />
          </Row>
          <Input
            control={control}
            label="E-mail da empresa"
            placeholder="Informe um e-mail válido"
            type="email"
            {...register('company.email')}
          />
          <Input
            control={control}
            label="CEP"
            placeholder="99999-999"
            required
            {...maskedRegister('company.zipCode', '99999-999')}
          />
          <Row>
            <Box
              flex={3}
              w="full"
            >
              <Input
                control={control}
                label="Rua"
                placeholder="Informe o nome da rua"
                required
                {...register('company.street')}
              />
            </Box>
            <Box
              flex={1}
              w="full"
            >
              <Input
                control={control}
                label="Número"
                placeholder="Ex: 1234"
                required
                {...register('company.number')}
              />
            </Box>
          </Row>
          <Input
            control={control}
            label="Complemento"
            placeholder="Informe o complemento"
            {...register('company.complement')}
          />
          <HStack gap={4}>
            <Input
              control={control}
              label="Bairro"
              placeholder="Informe o bairro"
              required
              {...register('company.neighborhood')}
            />
            <Input
              control={control}
              label="Cidade"
              placeholder="Informe a cidade"
              required
              {...register('company.city')}
            />
          </HStack>
          <Select
            collection={ufList}
            control={control}
            label="Estado"
            placeholder="Selecione um estado"
            required
            {...register('company.state')}
          />
        </Fieldset.Content>
      </Fieldset.Root>
    </Stack>
  )
}

const Company = memo(CompanyComponent)

export { Company }
