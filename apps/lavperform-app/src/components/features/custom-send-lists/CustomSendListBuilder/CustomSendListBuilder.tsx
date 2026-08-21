import {
  Alert,
  Box,
  Button,
  Checkbox,
  Field,
  HStack,
  Icon,
  Input,
  InputGroup,
  RadioGroup,
  Stack,
  Table,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { RiDownloadLine, RiSearchLine, RiUploadLine } from 'react-icons/ri'

import { Empty, LoadingState, toaster } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useCustomers } from '@/hooks/queries/useCustomers'
import {
  useCreateCustomSendList,
  useCustomSendListMemberIds,
  useImportCustomSendListCustomers,
  useUpdateCustomSendList,
  useUpdateCustomSendListMembers,
} from '@/hooks/queries/useCustomSendLists'
import type { CustomSendList, ImportCustomSendListCustomer } from '@/types'
import { formatTelefone } from '@/utils/mask'

import {
  downloadCustomSendListCsvTemplate,
  parseCustomSendListCsv,
} from './customSendListCsv'

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
  const [initialMemberIds, setInitialMemberIds] = useState<Set<string>>(
    new Set(),
  )
  const [csvCustomers, setCsvCustomers] = useState<
    ImportCustomSendListCustomer[]
  >([])
  const [csvFileName, setCsvFileName] = useState('')
  const [importMode, setImportMode] = useState<'ADD' | 'REPLACE'>('ADD')
  const [isParsingCsv, setIsParsingCsv] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const initializedMembers = useRef(false)

  const createList = useCreateCustomSendList()
  const updateList = useUpdateCustomSendList()
  const updateMembers = useUpdateCustomSendListMembers()
  const importCustomers = useImportCustomSendListCustomers()

  const { data: memberIds, isLoading: isLoadingMembers } =
    useCustomSendListMemberIds(companyId, list?.id)

  const { data: customersData, isLoading: isLoadingCustomers } = useCustomers(
    companyId,
    {
      page,
      limit: 50,
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
    if (memberIds && !initializedMembers.current) {
      const ids = new Set(memberIds)
      setInitialMemberIds(ids)
      setSelectedIds(ids)
      initializedMembers.current = true
    }
  }, [memberIds])

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

  const handleImportModeChange = (value: string | null) => {
    const nextMode = value === 'REPLACE' ? 'REPLACE' : 'ADD'
    setImportMode(nextMode)
    setSelectedIds((current) => {
      const next = new Set(current)
      if (nextMode === 'REPLACE') {
        initialMemberIds.forEach((id) => next.delete(id))
      } else {
        initialMemberIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const handleCsvFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsParsingCsv(true)
    try {
      const parsed = await parseCustomSendListCsv(file)
      setCsvCustomers(parsed)
      setCsvFileName(file.name)
      toaster.create({
        title: 'CSV pronto para importação',
        description: `${parsed.length} contato(s) serão processados após salvar a lista.`,
        type: 'success',
        closable: true,
      })
    } catch (error) {
      setCsvCustomers([])
      setCsvFileName('')
      handleImportModeChange('ADD')
      toaster.create({
        title: 'CSV inválido',
        description:
          error instanceof Error ? error.message : 'Não foi possível ler o arquivo.',
        type: 'error',
        closable: true,
      })
    } finally {
      setIsParsingCsv(false)
      event.target.value = ''
    }
  }

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

    if (selectedIds.size === 0 && csvCustomers.length === 0) {
      toaster.create({
        title: 'Adicione clientes',
        description: 'Selecione ao menos um cliente ou envie um arquivo CSV.',
        type: 'error',
        closable: true,
      })
      return
    }

    setIsSaving(true)
    try {
      const customerIds = Array.from(selectedIds)

      let savedListId: string

      if (list?.id) {
        await updateList.mutateAsync({
          companyId,
          listId: list.id,
          data: {
            name: trimmedName,
            description: description.trim() || undefined,
          },
        })

        const csvWillReplaceMembers =
          csvCustomers.length > 0 && importMode === 'REPLACE'
        if (!csvWillReplaceMembers) {
          const addCustomerIds = customerIds.filter(
            (id) => !initialMemberIds.has(id),
          )
          const removeCustomerIds = [...initialMemberIds].filter(
            (id) => !selectedIds.has(id),
          )
          if (addCustomerIds.length > 0 || removeCustomerIds.length > 0) {
            await updateMembers.mutateAsync({
              companyId,
              listId: list.id,
              data: { addCustomerIds, removeCustomerIds },
            })
          }
        }
        savedListId = list.id
      } else {
        const created = await createList.mutateAsync({
          companyId,
          data: {
            name: trimmedName,
            description: description.trim() || undefined,
            customerIds,
          },
        })
        savedListId = created.id
      }

      if (csvCustomers.length > 0) {
        try {
          const result = await importCustomers.mutateAsync({
            companyId,
            listId: savedListId,
            data: {
              customers: csvCustomers,
              replaceCustomerIds:
                list?.id && importMode === 'REPLACE'
                  ? customerIds
                  : undefined,
            },
          })
          if (result.rejected > 0) {
            toaster.create({
              title: 'Algumas linhas foram ignoradas',
              description: `${result.rejected} contato(s) tinham dados inválidos ou telefone repetido.`,
              type: 'warning',
              closable: true,
            })
          }
        } catch (error: any) {
          toaster.create({
            title: 'Lista salva, mas o CSV não foi totalmente enfileirado',
            description:
              error?.response?.data?.message ??
              'Edite a lista e envie o arquivo novamente para tentar a importação.',
            type: 'warning',
            closable: true,
          })
          onSaved()
          return
        }
      }

      toaster.create({
        title:
          csvCustomers.length > 0
            ? 'Lista salva e importação iniciada'
            : 'Lista salva',
        description:
          csvCustomers.length > 0
            ? 'O CSV será processado em segundo plano. Dependendo do tamanho, isso pode levar de alguns instantes a algumas horas. Volte mais tarde para acompanhar a lista.'
            : 'A lista personalizada foi salva com sucesso.',
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

  if (list?.id && isLoadingMembers) {
    return <LoadingState />
  }

  return (
    <Stack flex="1 1 auto" gap={4} minH={0}>
      <Stack flexShrink={0} gap={3}>
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
        <HStack flexWrap="wrap" gap={2} justify="space-between">
          <Text color="fg.muted" fontSize="sm">
            {selectedIds.size}{' '}
            {selectedIds.size === 1 ? 'cliente selecionado' : 'clientes selecionados'}
          </Text>
          <HStack gap={2}>
            <Button
              onClick={downloadCustomSendListCsvTemplate}
              size="xs"
              variant="ghost"
            >
              <RiDownloadLine />
              Modelo CSV
            </Button>
            <Button
              as="label"
              cursor="pointer"
              loading={isParsingCsv}
              size="xs"
              variant="outline"
            >
              <RiUploadLine />
              Importar CSV
              <Input
                accept=".csv,text/csv"
                display="none"
                onChange={handleCsvFile}
                type="file"
              />
            </Button>
          </HStack>
        </HStack>

        {csvCustomers.length > 0 ? (
          <Alert.Root size="sm" status="info" variant="surface">
            <Alert.Indicator />
            <Alert.Content gap={2}>
              <Alert.Description>
                <strong>{csvFileName}</strong>: {csvCustomers.length} contato(s)
                serão importados em segundo plano ao salvar. Dependendo do
                tamanho, pode levar de alguns instantes a algumas horas — você
                pode voltar mais tarde para conferir.
              </Alert.Description>
              {list?.id ? (
                <RadioGroup.Root
                  onValueChange={({ value }) => handleImportModeChange(value)}
                  size="sm"
                  value={importMode}
                >
                  <HStack gap={5}>
                    <RadioGroup.Item value="ADD">
                      <RadioGroup.ItemHiddenInput />
                      <RadioGroup.ItemIndicator />
                      <RadioGroup.ItemText>
                        Adicionar ao existente
                      </RadioGroup.ItemText>
                    </RadioGroup.Item>
                    <RadioGroup.Item value="REPLACE">
                      <RadioGroup.ItemHiddenInput />
                      <RadioGroup.ItemIndicator />
                      <RadioGroup.ItemText>Substituir lista</RadioGroup.ItemText>
                    </RadioGroup.Item>
                  </HStack>
                </RadioGroup.Root>
              ) : null}
            </Alert.Content>
          </Alert.Root>
        ) : null}
      </Stack>

      <InputGroup
        endElement={<Icon as={RiSearchLine} boxSize={4} />}
        flexShrink={0}
      >
        <Input
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setPage(1)
          }}
          placeholder="Buscar por nome ou telefone..."
          value={searchQuery}
        />
      </InputGroup>

      <Box flex="1 1 0" minH="120px" overflow="auto">
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
        <HStack flexShrink={0} justify="space-between">
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

      <HStack
        bg="bg.panel"
        borderTopWidth="1px"
        bottom={0}
        flexShrink={0}
        justify="flex-end"
        position="sticky"
        py={3}
      >
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
