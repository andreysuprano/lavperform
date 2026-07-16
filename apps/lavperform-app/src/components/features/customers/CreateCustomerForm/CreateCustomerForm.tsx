import { Button, Fieldset, Stack } from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { RiAddLine, RiSaveLine } from 'react-icons/ri'
import { useHookFormMask } from 'use-mask-input'

import { CustomDrawer, Input, toaster } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useCreateCustomer } from '@/hooks/queries'

import { FormData, schema } from './schema'

export function CreateCustomerForm() {
  const {
    register,
    formState: { isSubmitting },
    control,
    handleSubmit,
    reset,
  } = useForm<FormData>({
    mode: 'onChange',
    resolver: yupResolver<FormData, any, any>(schema),
    defaultValues: {
      name: '',
      phone: '',
      email: null,
    },
  })

  const maskedRegister = useHookFormMask(register)

  const [isOpen, setIsOpen] = useState(false)

  const { selectedCompany } = useAuth()

  const createCustomerMutation = useCreateCustomer()

  const handleSave = async (values: any) => {
    if (!selectedCompany) return null

    try {
      const response = await createCustomerMutation.mutateAsync({
        companyId: selectedCompany.id,
        data: values,
      })

      toaster.create({
        title: 'Sucesso',
        description: response.message || 'Cliente adicionado com sucesso!',
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
        'Não foi possível adicionar o cliente.'

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
    reset()
    setIsOpen(false)
  }

  return (
    <CustomDrawer
      footer={
        <Button
          form="hook-form"
          loading={isSubmitting}
          onClick={() => setIsOpen(true)}
          type="submit"
        >
          <RiSaveLine />
          Salvar
        </Button>
      }
      isOpen={isOpen}
      onExitComplete={reset}
      size="sm"
      title="Adicionar novo cliente"
      trigger={
        <Button w={{ base: 'full', md: 'auto' }}>
          <RiAddLine />
          Adicionar
        </Button>
      }
    >
      <Stack
        as="form"
        gap={6}
        id="hook-form"
        onSubmit={handleSubmit(handleSave)}
      >
        <Fieldset.Root>
          <Fieldset.Content>
            <Input
              control={control}
              label="Nome completo"
              placeholder="Informe o nome completo"
              required
              {...register('name')}
            />
            <Input
              control={control}
              label="Telefone"
              placeholder="(99) 99999-9999"
              required
              type="tel"
              {...maskedRegister('phone', '(99) 99999-9999')}
            />
            <Input
              control={control}
              label="E-mail"
              placeholder="Informe um e-mail válido"
              type="email"
              {...register('email')}
            />
          </Fieldset.Content>
        </Fieldset.Root>
      </Stack>
    </CustomDrawer>
  )
}
