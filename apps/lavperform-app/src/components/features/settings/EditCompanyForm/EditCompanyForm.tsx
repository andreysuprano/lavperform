import { Box, Button, Fieldset, HStack, Stack, Text } from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { BsBuilding } from 'react-icons/bs'
import { FaMapMarkerAlt } from 'react-icons/fa'
import { RiEditLine, RiSaveLine } from 'react-icons/ri'
import { useHookFormMask } from 'use-mask-input'

import { CustomDrawer, Input, Select, toaster } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { companyService } from '@/services'
import { ufList } from '@/utils/constants/uf'

import { Props } from './EditCompanyForm.types'
import { FormData, schema } from './schema'

export function EditCompanyForm({ company, onClose, onSuccess }: Props) {
  const { selectedCompany } = useAuth()
  const {
    register,
    formState: { isSubmitting },
    control,
    handleSubmit,
    reset,
  } = useForm<FormData>({
    mode: 'onChange',
    resolver: yupResolver<FormData, any, any>(schema),
    values: {
      ...company,
      address: {
        ...company.address,
        state: company.address.state,
      },
    },
    defaultValues: {
      ...company,
      address: {
        ...company.address,
        state: company.address.state,
      },
    },
  })

  const maskedRegister = useHookFormMask(register)

  const [isOpen, setIsOpen] = useState(false)

  const handleSave = async (values: any) => {
    if (!selectedCompany) return

    try {
      const response = await companyService.updateCompany(
        selectedCompany.id,
        values
      )

      toaster.create({
        title: 'Sucesso',
        description: response.data.message || 'Dados da empresa atualizados!',
        type: 'success',
      })

      onSuccess()

      handleClose()
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } }
        message?: string
      }

      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Não foi possível atualizar a empresa.'

      toaster.create({
        title: 'Erro ao salvar',
        description: errorMessage,
        type: 'error',
      })
    }
  }

  function handleClose() {
    onClose()

    reset()

    setIsOpen(false)
  }

  return (
    <CustomDrawer
      footer={
        <Button
          form="company-form"
          loading={isSubmitting}
          onClick={() => setIsOpen(true)}
          type="submit"
        >
          <RiSaveLine />
          Salvar
        </Button>
      }
      isOpen={isOpen}
      onExitComplete={handleClose}
      title="Editar dados da empresa"
      trigger={
        <Button size="xs">
          <RiEditLine />
          Editar
        </Button>
      }
    >
      <Stack
        as="form"
        gap={6}
        id="company-form"
        onSubmit={handleSubmit(handleSave)}
      >
        <Fieldset.Root>
          <Fieldset.Legend>
            <HStack>
              <Box
                as={BsBuilding}
                color="gray.600"
                fontSize="lg"
              />
              <Text fontWeight="semibold">Dados da empresa</Text>
            </HStack>
          </Fieldset.Legend>
          <Fieldset.Content>
            <Input
              control={control}
              disabled
              label="CNPJ"
              {...maskedRegister('cnpj', '99.999.999/9999-99')}
            />
            <Input
              control={control}
              label="Nome da Empresa"
              required
              {...register('name')}
            />
            <Input
              control={control}
              label="Telefone"
              required
              {...maskedRegister('phone', '(99) 99999-9999')}
            />
            <Input
              control={control}
              label="E-mail"
              type="email"
              {...register('email')}
            />
          </Fieldset.Content>
        </Fieldset.Root>
        <Fieldset.Root>
          <Fieldset.Legend>
            <HStack>
              <Box
                as={FaMapMarkerAlt}
                color="gray.600"
                fontSize="lg"
              />
              <Text fontWeight="semibold">Endereço da empresa</Text>
            </HStack>
          </Fieldset.Legend>
          <Fieldset.Content>
            <HStack gap={4}>
              <Box flex={3}>
                <Input
                  control={control}
                  label="Rua"
                  required
                  {...register('address.street')}
                />
              </Box>
              <Box flex={1}>
                <Input
                  control={control}
                  label="Número"
                  required
                  {...register('address.number')}
                />
              </Box>
            </HStack>
            <HStack gap={4}>
              <Input
                control={control}
                label="Bairro"
                required
                {...register('address.neighborhood')}
              />
              <Input
                control={control}
                label="Cidade"
                required
                {...register('address.city')}
              />
            </HStack>
            <HStack gap={4}>
              <Select
                collection={ufList}
                control={control}
                label="Estado"
                name="address.state"
                placeholder="Selecione um estado"
                required
              />
              <Input
                control={control}
                label="CEP"
                required
                {...maskedRegister('address.zipCode', '99999-999')}
              />
            </HStack>
            <Input
              control={control}
              label="Complemento"
              {...register('address.complement')}
            />
          </Fieldset.Content>
        </Fieldset.Root>
      </Stack>
    </CustomDrawer>
  )
}
