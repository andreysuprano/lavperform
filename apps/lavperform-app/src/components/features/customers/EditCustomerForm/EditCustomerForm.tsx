import {
  Box,
  Field,
  Fieldset,
  Flex,
  Separator,
  Switch,
  Text,
  createListCollection,
} from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { Controller, useForm } from 'react-hook-form'
import { useHookFormMask } from 'use-mask-input'

import { Input, Select, Textarea, toaster } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useUpdateCustomer } from '@/hooks/queries'
import { convertDateToISO } from '@/utils/convertDateToISO'
import { convertISOToDate } from '@/utils/convertISOToDate'
import { formatCpf, formatTelefone, formatCep } from '@/utils/mask'
import { clientTypesOptions } from '@/utils/constants/clientType'

import { Props } from './EditCustomerForm.types'
import { FormData, schema } from './schema'

const genderOptions = createListCollection({
  items: [
    { value: 'male', label: 'Masculino' },
    { value: 'female', label: 'Feminino' },
    { value: 'other', label: 'Outro' },
  ],
})

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text
      color="fg.muted"
      fontSize="xs"
      fontWeight="semibold"
      letterSpacing="wide"
      mb={3}
      mt={5}
      textTransform="uppercase"
    >
      {children}
    </Text>
  )
}

function EditCustomerForm({ data, onClose }: Props) {
  const { register, control, handleSubmit, reset } = useForm<FormData>({
    mode: 'onChange',
    resolver: yupResolver<FormData, any, any>(schema),
    defaultValues: {
      name: data.name,
      phone: data.phone ? formatTelefone(data.phone) : '',
      email: data.email ?? null,
      cpf: data.cpf ? formatCpf(data.cpf) : null,
      birthDate: data.birthDate
        ? convertISOToDate(data.birthDate, { timeZone: 'UTC' })
        : null,
      firstOrderDate: data.firstOrderDate
        ? convertISOToDate(data.firstOrderDate, { timeZone: 'UTC' })
        : null,
      rfvClassification: data.rfvClassification ?? null,
      gender: data.gender ?? null,
      observations: data.observations ?? null,
      whatsappOptin: data.whatsappOptin ?? false,
      averageTicket: data.averageTicket ? Number(data.averageTicket) : null,
      address: {
        zipCode: data.address?.zipCode ? formatCep(data.address.zipCode) : null,
        street: data.address?.street ?? null,
        number: data.address?.number ?? null,
        complement: data.address?.complement ?? null,
        neighborhood: data.address?.neighborhood ?? null,
        city: data.address?.city ?? null,
        state: data.address?.state ?? null,
      },
    },
  })

  const maskedRegister = useHookFormMask(register)

  const { selectedCompany } = useAuth()
  const updateCustomerMutation = useUpdateCustomer()

  const handleSave = async (values: FormData) => {
    if (!selectedCompany) return null

    const payload = {
      ...values,
      birthDate: convertDateToISO(values.birthDate ?? undefined),
      firstOrderDate: convertDateToISO(values.firstOrderDate ?? undefined),
    }

    try {
      const response = await updateCustomerMutation.mutateAsync({
        companyId: selectedCompany.id,
        customerId: data.id,
        data: payload,
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
          {/* Dados pessoais */}
          <SectionTitle>Dados Pessoais</SectionTitle>

          <Input
            control={control}
            label="Nome completo"
            required
            {...register('name')}
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
              label="CPF"
              placeholder="000.000.000-00"
              {...maskedRegister('cpf', '999.999.999-99')}
            />
          </Flex>

          <Input
            control={control}
            label="E-mail"
            type="email"
            {...register('email')}
          />

          <Flex gap={4}>
            <Input
              control={control}
              label="Data de nascimento"
              placeholder="DD/MM/AAAA"
              {...maskedRegister('birthDate', '99/99/9999')}
            />
            <Select
              collection={genderOptions}
              control={control}
              label="Gênero"
              name="gender"
              placeholder="Selecione"
            />
          </Flex>

          <Separator mt={2} />

          {/* Histórico e classificação */}
          <SectionTitle>Histórico e Classificação</SectionTitle>

          <Flex gap={4}>
            <Input
              control={control}
              label="Primeira venda"
              placeholder="DD/MM/AAAA"
              {...maskedRegister('firstOrderDate', '99/99/9999')}
            />
            <Input
              control={control}
              label="Ticket médio"
              placeholder="0,00"
              type="number"
              {...register('averageTicket')}
            />
          </Flex>

          <Select
            collection={clientTypesOptions}
            control={control}
            label="Classificação RFV"
            name="rfvClassification"
            placeholder="Selecione a classificação"
          />

          <Separator mt={2} />

          {/* Endereço */}
          <SectionTitle>Endereço</SectionTitle>

          <Flex gap={4}>
            <Box flex="0 0 160px">
              <Input
                control={control}
                label="CEP"
                placeholder="00000-000"
                {...maskedRegister('address.zipCode', '99999-999')}
              />
            </Box>
            <Input
              control={control}
              label="Logradouro"
              placeholder="Rua, Av..."
              {...register('address.street')}
            />
            <Box flex="0 0 100px">
              <Input
                control={control}
                label="Número"
                {...register('address.number')}
              />
            </Box>
          </Flex>

          <Flex gap={4}>
            <Input
              control={control}
              label="Complemento"
              placeholder="Apto, Bloco..."
              {...register('address.complement')}
            />
            <Input
              control={control}
              label="Bairro"
              {...register('address.neighborhood')}
            />
          </Flex>

          <Flex gap={4}>
            <Input
              control={control}
              label="Cidade"
              {...register('address.city')}
            />
            <Box flex="0 0 100px">
              <Input
                control={control}
                label="Estado (UF)"
                maxLength={2}
                placeholder="SP"
                {...register('address.state')}
              />
            </Box>
          </Flex>

          <Separator mt={2} />

          {/* Configurações */}
          <SectionTitle>Configurações</SectionTitle>

          <Textarea
            control={control}
            label="Observações"
            placeholder="Preferências, restrições ou anotações sobre o cliente..."
            rows={3}
            {...register('observations')}
          />

          <Controller
            control={control}
            name="whatsappOptin"
            render={({ field }) => (
              <Field.Root>
                <Switch.Root
                  checked={field.value ?? false}
                  colorPalette="green"
                  name={field.name}
                  onCheckedChange={({ checked }) => field.onChange(checked)}
                >
                  <Switch.HiddenInput onBlur={field.onBlur} />
                  <Switch.Control />
                  <Switch.Label>Aceita receber mensagens via WhatsApp</Switch.Label>
                </Switch.Root>
              </Field.Root>
            )}
          />
        </Fieldset.Content>
      </Fieldset.Root>
    </Box>
  )
}

export { EditCustomerForm, type Props as EditCustomerFormProps }
