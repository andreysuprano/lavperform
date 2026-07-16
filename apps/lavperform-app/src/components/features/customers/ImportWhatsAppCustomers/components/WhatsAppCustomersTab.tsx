import {
  Alert,
  Box,
  Checkbox,
  createListCollection,
  Flex,
  Icon,
  Input,
  InputGroup,
  Select,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { RiSearchLine, RiWhatsappLine } from 'react-icons/ri'

import { Empty, LoadingState, CustomTable } from '@/components'
import { useWhatsAppCustomers } from '@/hooks/queries'
import type { WhatsAppCustomer } from '@/types'
import { cleanNumber, extractBrazilianDdd, formatTelefone } from '@/utils/mask'
import { displayValue, formatOrPlaceholder } from '@/utils/strings'

import { Props } from './WhatsAppCustomersTab.types'

function WhatsAppCustomersTabBase({ companyId, onSelectionChange }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [dddFilter, setDddFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useWhatsAppCustomers(companyId)

  const allCustomers = response?.data ?? []

  // Debounce do filtro
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timeout)
  }, [searchQuery])

  // Calcular isActive para cada cliente
  const customersWithActive = useMemo(() => {
    if (!allCustomers) return []

    return allCustomers.map((customer) => {
      const phoneDigits = cleanNumber(customer.phone)
      const hasValidPhone = phoneDigits.length >= 10
      const isActive =
        customer.whatsappOptin && hasValidPhone && customer.isActive !== false

      return {
        ...customer,
        isActive,
      }
    })
  }, [allCustomers])

  const dddCollection = useMemo(() => {
    const ddds = new Set<string>()
    for (const c of allCustomers) {
      const ddd = extractBrazilianDdd(c.phone)
      if (ddd) ddds.add(ddd)
    }
    const sorted = Array.from(ddds).sort((a, b) => Number(a) - Number(b))
    const items = [
      { value: '', label: 'Todos os DDDs' },
      ...sorted.map((d) => ({ value: d, label: `DDD ${d}` })),
    ]
    return createListCollection({
      items,
      itemToString: (item) => item.label,
      itemToValue: (item) => item.value,
    })
  }, [allCustomers])

  // Filtrar por DDD e busca (somente na interface)
  const filteredCustomers = useMemo(() => {
    let list = customersWithActive
    if (dddFilter) {
      list = list.filter(
        (customer) => extractBrazilianDdd(customer.phone) === dddFilter
      )
    }

    if (!debouncedSearchQuery.trim()) {
      return list
    }

    const query = debouncedSearchQuery.toLowerCase().trim()
    const queryDigits = cleanNumber(debouncedSearchQuery).trim()

    if (!query && !queryDigits) {
      return list
    }

    return list.filter((customer) => {
      const nameMatch = customer.name.toLowerCase().includes(query)

      const customerPhoneDigits = cleanNumber(customer.phone)
      const phoneMatch = queryDigits
        ? customerPhoneDigits.includes(queryDigits)
        : false

      return nameMatch || phoneMatch
    })
  }, [customersWithActive, dddFilter, debouncedSearchQuery])

  // Clientes ativos (filtrados)
  const activeFilteredCustomers = useMemo(() => {
    return filteredCustomers.filter((customer) => customer.isActive)
  }, [filteredCustomers])

  // Remove da seleção contatos que deixaram de aparecer no filtro atual
  useEffect(() => {
    const visibleActiveIds = new Set(
      activeFilteredCustomers.map((c) => c.id)
    )
    setSelectedIds((prev) => {
      let removed = false
      const next = new Set<string>()
      prev.forEach((id) => {
        if (visibleActiveIds.has(id)) next.add(id)
        else removed = true
      })
      if (!removed && next.size === prev.size) return prev
      return next
    })
  }, [activeFilteredCustomers])

  // Seleção de todos os clientes ativos
  const allActiveSelected = useMemo(() => {
    if (activeFilteredCustomers.length === 0) return false
    return activeFilteredCustomers.every((customer) =>
      selectedIds.has(customer.id)
    )
  }, [activeFilteredCustomers, selectedIds])

  const someActiveSelected = useMemo(() => {
    return activeFilteredCustomers.some((customer) =>
      selectedIds.has(customer.id)
    )
  }, [activeFilteredCustomers, selectedIds])

  const handleToggleSelect = useCallback(
    (customerId: string, isActive: boolean) => {
      if (!isActive) return

      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(customerId)) {
          next.delete(customerId)
        } else {
          next.add(customerId)
        }
        return next
      })
    },
    []
  )

  const handleToggleSelectAll = useCallback(() => {
    if (allActiveSelected) {
      // Desmarcar todos os clientes ativos
      setSelectedIds((prev) => {
        const next = new Set(prev)
        activeFilteredCustomers.forEach((customer) => {
          next.delete(customer.id)
        })
        return next
      })
    } else {
      // Marcar todos os clientes ativos
      setSelectedIds((prev) => {
        const next = new Set(prev)
        prev.forEach((id) => next.add(id))
        activeFilteredCustomers.forEach((customer) => {
          next.add(customer.id)
        })
        return next
      })
    }
  }, [allActiveSelected, activeFilteredCustomers])

  // Notificar mudanças na seleção
  useEffect(() => {
    onSelectionChange(Array.from(selectedIds))
  }, [selectedIds, onSelectionChange])

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value)
    },
    []
  )

  if (isLoading) {
    return <LoadingState title="Carregando clientes do WhatsApp..." />
  }

  if (isError) {
    return (
      <Empty
        description={
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os clientes do WhatsApp.'
        }
        icon={RiWhatsappLine}
        title="Erro ao carregar clientes"
      />
    )
  }

  if (!allCustomers || allCustomers.length === 0) {
    return (
      <Empty
        description="Não há clientes do WhatsApp disponíveis para importação ou aguarde a conclusão da importação."
        icon={RiWhatsappLine}
        title="Nenhum cliente encontrado"
      />
    )
  }

  return (
    <VStack
      alignItems="stretch"
      gap={4}
      w="100%"
    >
      <Flex
        flexDirection={{ base: 'column', sm: 'row' }}
        gap={3}
        w="100%"
      >
        <Box flex={{ sm: 1 }} minW={0}>
          <InputGroup endElement={<Icon as={RiSearchLine} />}>
            <Input
              onChange={handleSearchChange}
              placeholder="Buscar por nome ou telefone..."
              value={searchQuery}
            />
          </InputGroup>
        </Box>
        <Box flexShrink={0} w={{ base: '100%', sm: '200px' }}>
          <Select.Root
            collection={dddCollection}
            onValueChange={({ value }) => setDddFilter(value[0] ?? '')}
            positioning={{
              boundary: 'clipping-ancestors',
              fitViewport: true,
              gutter: 8,
              sameWidth: true,
              strategy: 'fixed',
            }}
            size="md"
            value={dddFilter ? [dddFilter] : ['']}
            w="full"
          >
            <Select.HiddenSelect />
            <Select.Control>
              <Select.Trigger cursor="pointer">
                <Select.ValueText placeholder="Filtrar por DDD" />
              </Select.Trigger>
              <Select.IndicatorGroup>
                <Select.Indicator />
              </Select.IndicatorGroup>
            </Select.Control>
            <Select.Positioner zIndex="skipNav">
              <Select.Content>
                {dddCollection.items.map((item) => (
                  <Select.Item
                    cursor="pointer"
                    item={item}
                    key={item.value === '' ? 'all' : item.value}
                  >
                    {item.label}
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Select.Root>
        </Box>
      </Flex>

      {/* Alert de aviso */}
      <Alert.Root
        borderRadius="md"
        status="warning"
        variant="surface"
      >
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>
            <strong>Atenção!</strong> Os clientes duplicados em sua base de
            clientes não serão duplicados após a conclusão da importação.
          </Alert.Title>
        </Alert.Content>
      </Alert.Root>

      {/* Tabela de clientes com scroll vertical */}
      <Box w="100%">
        <CustomTable<WhatsAppCustomer>
          data={filteredCustomers}
          emptyStateMessage="Nenhum cliente encontrado com o filtro aplicado"
          handleLimitChange={() => {}}
          handlePageChange={() => {}}
          maxHeight="23vh"
          header={
            <>
              <Table.ColumnHeader w="40px">
                <Checkbox.Root
                  checked={allActiveSelected || (someActiveSelected && !allActiveSelected)}
                  onCheckedChange={handleToggleSelectAll}
                  disabled={activeFilteredCustomers.length === 0}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                </Checkbox.Root>
              </Table.ColumnHeader>
              <Table.ColumnHeader flex={1}>Nome</Table.ColumnHeader>
              <Table.ColumnHeader w="180px">Telefone</Table.ColumnHeader>
            </>
          }
          isLoading={false}
        >
          {filteredCustomers.map((customer) => {
            const isSelected = selectedIds.has(customer.id)

            return (
              <Table.Row
                key={customer.id}
                opacity={customer.isActive ? 1 : 0.6}
              >
                <Table.Cell>
                  <Checkbox.Root
                    checked={isSelected}
                    disabled={!customer.isActive}
                    onCheckedChange={() =>
                      handleToggleSelect(customer.id, customer.isActive)
                    }
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                  </Checkbox.Root>
                </Table.Cell>
                <Table.Cell>
                  <Text lineClamp={1}>{displayValue(customer.name)}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text lineClamp={1}>
                    {formatOrPlaceholder(customer.phone, formatTelefone)}
                  </Text>
                </Table.Cell>
              </Table.Row>
            )
          })}
        </CustomTable>
      </Box>
    </VStack>
  )
}

const WhatsAppCustomersTab = memo(
  WhatsAppCustomersTabBase
) as typeof WhatsAppCustomersTabBase

export { WhatsAppCustomersTab }
