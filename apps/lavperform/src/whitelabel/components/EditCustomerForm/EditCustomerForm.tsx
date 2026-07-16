import { Box, Fieldset, Flex } from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useForm } from 'react-hook-form'
import { useHookFormMask } from 'use-mask-input'

import { Input, toaster } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useUpdateCustomer } from '@/hooks/queries'
import { convertDateToISO } from '@/utils/convertDateToISO'
import { convertISOToDate } from '@/utils/convertISOToDate'
import { formatTelefone } from '@/utils/mask'

import { Props } from './EditCustomerForm.types'
import { FormData, schema } from './schema'

function EditCustomerForm({ data, onClose }: Props) {
  const { register, control, handleSubmit, reset } = useForm<FormData>({
    mode: 'onChange',
    resolver: yupResolver<FormData, any, any>(schema),
    defaultValues: {
      ...data,
      phone: data.phone ? formatTelefone(data.phone) : '',
      birthDate: data.birthDate
        ? convertISOToDate(data.birthDate, {
            timeZone: 'UTC',
          })
        : '',
    },
  })

  const maskedRegister = useHookFormMask(register)

  const { selectedCompany } = useAuth()

  const updateCustomerMutation = useUpdateCustomer()

  const handleSave = async (values: any) => {
    if (!selectedCompany) return null

    values = {
      ...values,
      birthDate: convertDateToISO(values.birthDate),
    }

    try {
      const response = await updateCustomerMutation.mutateAsync({
        companyId: selectedCompany.id,
        customerId: data.id,
        data: values,
      })

      toaster.create({
        title: 'Sucesso',
        description: response.message || 'Cliente alterado com sucesso!',
        type: 'success',
        closable: true,
        duration: 2000,
      })

      handleClose()
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } }
        message?: string
      }

      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Não foi possível editar o cliente.'

      toaster.create({
        title: 'Erro ao salvar',
        description: errorMessage,
        type: 'error',
        closable: true,
        duration: 4000,
      })
    }
  }

  const handleClose = () => {
    onClose()
    reset()
  }

  return (
    <Box
      as="form"
      id="data-form"
      onSubmit={handleSubmit(handleSave)}
    >
      <Fieldset.Root>
        <Fieldset.Content>
          <Input
            control={control}
            label="Nome completo"
            required
            {...register('name')}
          />
          <Input
            control={control}
            label="Email"
            {...register('email')}
          />
          <Flex gap={4}>
            <Input
              control={control}
              label="Telefone"
              placeholder="+99 (99) 99999-9999"
              required
              type="tel"
              {...maskedRegister('phone', '+99 (99) 99999-9999')}
            />
            <Input
              control={control}
              label="Data de nascimento"
              {...maskedRegister('birthDate', '99/99/9999')}
            />
          </Flex>
          {/* <Controller
            control={control}
            name="whatsappOptin"
            render={({ field }) => (
              <Field.Root>
                <Switch.Root
                  checked={field.value}
                  colorPalette="green"
                  name={field.name}
                  onCheckedChange={({ checked }) => field.onChange(checked)}
                >
                  <Switch.HiddenInput onBlur={field.onBlur} />
                  <Switch.Control />
                  <Switch.Label>
                    Deseja receber disparos via Whatsapp
                  </Switch.Label>
                </Switch.Root>
              </Field.Root>
            )}
          /> */}
        </Fieldset.Content>
      </Fieldset.Root>
    </Box>
  )
}

export { EditCustomerForm, type Props as EditCustomerFormProps }
