import {
  Avatar,
  Button,
  createListCollection,
  Fieldset,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { RiSaveLine } from 'react-icons/ri'

import { CustomDrawer, Select, toaster } from '@/components'
import { useUpdateCompanyStatus } from '@/hooks/queries'
import { companyService } from '@/services'
import type { Company } from '@/types'
import { formatCep, formatCnpj, formatTelefone } from '@/utils/mask'

import { Props } from './CompanyDetailsDrawer.types'
import { FormData, schema } from './schema'

const stateOptions = createListCollection({
  items: [
    { label: 'Pendente', value: 'PENDING' },
    { label: 'Ativo', value: 'ACTIVE' },
    { label: 'Inativo', value: 'INACTIVE' },
  ],
})

function CompanyDetailsDrawer({ companyId, onClose }: Props) {
  const [company, setCompany] = useState<Company | null>(null)
  const [isOpen, setIsOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const updateCompanyStatusMutation = useUpdateCompanyStatus()

  const {
    formState: { isSubmitting },
    control,
    handleSubmit,
    reset,
    setValue,
  } = useForm<FormData>({
    mode: 'onChange',
    resolver: yupResolver<FormData, any, any>(schema),
  })

  const loadCompanyData = async () => {
    if (!companyId) return

    setIsLoading(true)
    try {
      const response = await companyService.getCompany(companyId)
      setCompany(response.data)
      setValue('state', response.data.state)
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } }
        message?: string
      }

      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Não foi possível carregar os dados da empresa.'

      toaster.create({
        title: 'Erro ao carregar',
        description: errorMessage,
        type: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadCompanyData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleSave = async (values: FormData) => {
    if (!companyId || !values.state) return

    const selectedState = values.state as 'PENDING' | 'ACTIVE' | 'INACTIVE'

    try {
      await updateCompanyStatusMutation.mutateAsync({
        companyId,
        state: selectedState,
      })

      toaster.create({
        title: 'Sucesso',
        description: 'Status da empresa atualizado!',
        type: 'success',
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
        'Não foi possível atualizar o status da empresa.'

      toaster.create({
        title: 'Erro ao salvar',
        description: errorMessage,
        type: 'error',
      })
    }
  }

  const handleClose = () => {
    onClose()
    reset()
    setIsOpen(false)
    setCompany(null)
  }

  if (!company && !isLoading) {
    return null
  }

  return (
    <CustomDrawer
      footer={
        <Button
          disabled={isLoading || !company}
          form="company-state-form"
          loading={isSubmitting}
          type="submit"
        >
          <RiSaveLine />
          Salvar
        </Button>
      }
      isOpen={isOpen}
      onExitComplete={handleClose}
      size={'sm'}
      title={company ? `Empresa: ${company.name}` : 'Carregando...'}
    >
      {isLoading ? (
        <Text>Carregando...</Text>
      ) : company ? (
        <Stack gap={6}>
          <Fieldset.Root>
            <Fieldset.Content>
              <Avatar.Root
                shape="rounded"
                size="xl"
              >
                <Avatar.Image src={company.avatarUrl} />
                <Avatar.Fallback name={company.name} />
              </Avatar.Root>
              <VStack
                align="flex-start"
                gap={2}
              >
                <Text fontSize="sm">
                  <strong>Nome:</strong> {company.name}
                </Text>
                <Text fontSize="sm">
                  <strong>CNPJ:</strong> {formatCnpj(company.cnpj)}
                </Text>
                <Text fontSize="sm">
                  <strong>E-mail:</strong> {company.email}
                </Text>
                <Text fontSize="sm">
                  <strong>Telefone:</strong> {formatTelefone(company.phone)}
                </Text>
              </VStack>
            </Fieldset.Content>
          </Fieldset.Root>
          <Fieldset.Root>
            <Fieldset.Content>
              <VStack
                align="flex-start"
                gap={1}
              >
                <strong>Endereço:</strong>
                <Text fontSize="sm">
                  {company.address.street}, {company.address.number}
                  {company.address.complement &&
                    `, ${company.address.complement}`}
                </Text>
                <Text fontSize="sm">
                  {company.address.neighborhood} - {company.address.city}/
                  {company.address.state}
                </Text>
                <Text fontSize="sm">
                  CEP: {formatCep(company.address.zipCode)}
                </Text>
              </VStack>
            </Fieldset.Content>
          </Fieldset.Root>
          <Stack
            as="form"
            gap={4}
            id="company-state-form"
            onSubmit={handleSubmit(handleSave)}
          >
            <Fieldset.Root>
              <Fieldset.Content>
                <Select
                  collection={stateOptions}
                  control={control}
                  label="Status"
                  name="state"
                  placeholder="Selecione um status"
                  required
                />
              </Fieldset.Content>
            </Fieldset.Root>
          </Stack>
        </Stack>
      ) : null}
    </CustomDrawer>
  )
}

export { CompanyDetailsDrawer, type Props as CompanyDetailsDrawerProps }
