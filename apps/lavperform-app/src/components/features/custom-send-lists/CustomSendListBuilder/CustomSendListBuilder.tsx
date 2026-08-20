import {
  Box,
  Button,
  Checkbox,
  Field,
  HStack,
  Icon,
  Input,
  InputGroup,
  Stack,
  Table,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { RiSearchLine } from 'react-icons/ri'

import { Empty, LoadingState, toaster } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useCustomers } from '@/hooks/queries/useCustomers'
import {
  useCreateCustomSendList,
  useCustomSendList,
  useReplaceCustomSendListMembers,
  useUpdateCustomSendList,
} from '@/hooks/queries/useCustomSendLists'
import type { CustomSendList } from '@/types'
import { formatTelefone } from '@/utils/mask'

type Props = {
  list?: CustomSendList
  onCancel: () => void
  onSaved: () => void
}

export function CustomSendListBuilder({ list, onCancel, onSaved }: Props) {
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id

  const [name, setName] = useState(list?.name ?? '')
  const [description, setDescription] = useState(list?.description ?? '')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)

  const createList = useCreateCustomSendList()
  const updateList = useUpdateCustomSendList()
  const replaceMembers = useReplaceCustomSendListMembers()

  const { data: listDetail, isLoading: isLoadingDetail } = useCustomSendList(
    companyId,
    list?.id,
    { page: 1, limit: 5000 },
  )

  const { data: customersData, isLoading: isLoadingCustomers } = useCustomers(
    companyId,
    {
      page,
      limit: 20,
      name: debouncedSearch || undefined,
      orderBy: 'name',
      orderDirection: 'asc',
    },
  )

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  useEffect(() => {
    if (listDetail?.members?.length) {
      setSelectedIds(new Set(listDetail.members.map((member) => member.id)))
    }
  }, [listDetail?.members])

  const customers = customersData?.items ?? []
  const meta = customersData?.meta

  const toggleCustomer = (customerId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(customerId)
      else next.delete(customerId)
      return next
    })
  }

  const toggleAllOnPage = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const customer of customers) {
        if (checked) next.add(customer.id)
        else next.delete(customer.id)
      }
      return next
    })
  }

  const allOnPageSelected =
    customers.length > 0 && customers.every((customer) => selectedIds.has(customer.id))

  const handleSave = async () => {
    if (!companyId) return

    const trimmedName = name.trim()
    if (!trimmedName) {
      toaster.create({
        title: 'Nome obrigatório',
        description: 'Informe um nome para a lista.',
        type: 'error',
        closable: true,
      })
      return
    }

    if (selectedIds.size === 0) {
      toaster.create({
        title: 'Selecione clientes',
        description: 'Escolha ao menos um cliente para a lista.',
        type: 'error',
        closable: true,
      })
      return
    }

    setIsSaving(true)
    try {
      const customerIds = Array.from(selectedIds)

      if (list?.id) {
        await updateList.mutateAsync({
          companyId,
          listId: list.id,
          data: {
            name: trimmedName,
            description: description.trim() || undefined,
          },
        })
        await replaceMembers.mutateAsync({
          companyId,
          listId: list.id,
          data: { customerIds },
        })
      } else {
        await createList.mutateAsync({
          companyId,
          data: {
            name: trimmedName,
            description: description.trim() || undefined,
            customerIds,
          },
        })
      }

      toaster.create({
        title: 'Lista salva',
        description: 'A lista personalizada foi salva com sucesso.',
        type: 'success',
        closable: true,
      })
      onSaved()
    } catch (error: any) {
      toaster.create({
        title: 'Erro ao salvar',
        description:
          error?.response?.data?.message ??
          error?.message ??
          'Não foi possível salvar a lista.',
        type: 'error',
        closable: true,
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (list?.id && isLoadingDetail) {
    return <LoadingState />
  }

  return (
    <Stack gap={4} h="full" minH={0}>
      <Stack gap={3}>
        <Field.Root required>
          <Field.Label>
            Nome da lista
            <Field.RequiredIndicator />
          </Field.Label>
          <Input
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Clientes VIP"
            value={name}
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>Descrição (opcional)</Field.Label>
          <Textarea
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o propósito desta lista"
            rows={2}
            value={description}
          />
        </Field.Root>
        <HStack color="fg.muted" fontSize="sm" justify="space-between">
          <Text>
            {selectedIds.size}{' '}
            {selectedIds.size === 1 ? 'cliente selecionado' : 'clientes selecionados'}
          </Text>
        </HStack>
      </Stack>

      <InputGroup endElement={<Icon as={RiSearchLine} boxSize={4} />}>
        <Input
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setPage(1)
          }}
          placeholder="Buscar por nome ou telefone..."
          value={searchQuery}
        />
      </InputGroup>

      <Box flex={1} minH={0} overflow="auto">
        {isLoadingCustomers ? (
          <LoadingState />
        ) : customers.length === 0 ? (
          <Empty
            description="Ajuste a busca ou cadastre clientes na base."
            title="Nenhum cliente encontrado"
          />
        ) : (
          <Table.ScrollArea borderRadius={10} borderWidth="1px">
            <Table.Root interactive showColumnBorder size="sm" stickyHeader>
              <Table.Header>
                <Table.Row background="bg.muted">
                  <Table.ColumnHeader w="40px">
                    <Checkbox.Root
                      checked={allOnPageSelected}
                      onCheckedChange={({ checked }) =>
                        toggleAllOnPage(checked === true)
                      }
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                    </Checkbox.Root>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader>Cliente</Table.ColumnHeader>
                  <Table.ColumnHeader>Telefone</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {customers.map((customer) => (
                  <Table.Row key={customer.id}>
                    <Table.Cell>
                      <Checkbox.Root
                        checked={selectedIds.has(customer.id)}
                        onCheckedChange={({ checked }) =>
                          toggleCustomer(customer.id, checked === true)
                        }
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                      </Checkbox.Root>
                    </Table.Cell>
                    <Table.Cell>{customer.name}</Table.Cell>
                    <Table.Cell>
                      {customer.phone ? formatTelefone(customer.phone) : '—'}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        )}
      </Box>

      {meta && meta.totalPages > 1 ? (
        <HStack justify="space-between">
          <Button
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            size="sm"
            variant="outline"
          >
            Anterior
          </Button>
          <Text color="fg.muted" fontSize="sm">
            Página {page} de {meta.totalPages}
          </Text>
          <Button
            disabled={page >= meta.totalPages}
            onClick={() =>
              setPage((current) => Math.min(meta.totalPages, current + 1))
            }
            size="sm"
            variant="outline"
          >
            Próxima
          </Button>
        </HStack>
      ) : null}

      <HStack justify="flex-end" pt={2}>
        <Button onClick={onCancel} variant="ghost">
          Cancelar
        </Button>
        <Button loading={isSaving} onClick={handleSave}>
          Salvar lista
        </Button>
      </HStack>
    </Stack>
  )
}
