import { Alert, Badge, Flex, Input, Table, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RiCheckboxCircleLine, RiCloseCircleLine } from 'react-icons/ri'

import {
  CreateCustomerForm,
  CustomerDetailsDrawer,
  CustomTable,
  ImportCustomersWizard,
} from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useCustomers } from '@/hooks/queries'
import type { Customer } from '@/types'
import { clientTypesOptions } from '@/utils/constants/clientType'
import { formatTelefone } from '@/utils/mask'
import {
  displayValue,
  EMPTY_PLACEHOLDER,
  formatOrPlaceholder,
  normalizeText,
} from '@/utils/strings'

export function CustomerList() {
  const { selectedCompany } = useAuth()

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [params, setParams] = useState({
    page: 1,
    limit: 20,
    orderBy: 'createdAt',
    orderDirection: 'desc' as 'asc' | 'desc',
  })
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  )

  const queryParams = useMemo(
    () => ({
      ...params,
      ...(debouncedSearchQuery && { name: debouncedSearchQuery }),
    }),
    [params, debouncedSearchQuery]
  )

  const { data, isLoading } = useCustomers(selectedCompany?.id, queryParams)

  const customers = data?.items ?? []
  const meta = data?.meta

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)

    return () => clearTimeout(timeout)
  }, [searchQuery])

  useEffect(() => {
    setParams((prev) => ({ ...prev, page: 1 }))
  }, [debouncedSearchQuery])

  const handleLimitChange = useCallback((limit: number) => {
    setParams((prev) => ({ ...prev, limit, page: 1 }))
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setParams((prev) => ({ ...prev, page }))
  }, [])

  const handleCustomerSelect = useCallback((customer: Customer) => {
    setSelectedCustomer(customer)
  }, [])

  const handleCustomerClose = useCallback(() => {
    setSelectedCustomer(null)
  }, [])

  const clientTypeMap = useMemo(() => {
    return Object.fromEntries(
      clientTypesOptions.items.map((option) => [option.value, option.label])
    )
  }, [])

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleSearch(e.target.value)
    },
    [handleSearch]
  )

  return (
    <>
      <Flex
        alignItems="center"
        flexDirection={{ base: 'column', md: 'row' }}
        gap={2}
      >
        <Input
          bg="bg"
          onChange={handleSearchChange}
          placeholder="Pesquisar cliente..."
          value={searchQuery}
        />
        <ImportCustomersWizard />
        <CreateCustomerForm />
      </Flex>
      <Alert.Root
        borderRadius="md"
        status="warning"
        variant="surface"
      >
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>
            <strong>Atenção!</strong> Após a configuração da integração com o
            seu Cardápio Digital os dados dos seus clientes serão preenchidos
            automaticamente.
          </Alert.Title>
        </Alert.Content>
      </Alert.Root>
      <CustomTable<Customer>
        data={customers}
        emptyStateMessage="Nenhum cliente encontrado"
        handleLimitChange={handleLimitChange}
        handlePageChange={handlePageChange}
        header={
          <>
            <Table.ColumnHeader>Nome</Table.ColumnHeader>
            <Table.ColumnHeader>E-mail</Table.ColumnHeader>
            <Table.ColumnHeader>Telefone</Table.ColumnHeader>
            <Table.ColumnHeader>Whatsapp Optin</Table.ColumnHeader>
            <Table.ColumnHeader>Classificação</Table.ColumnHeader>
            <Table.ColumnHeader>Nível</Table.ColumnHeader>
          </>
        }
        isLoading={isLoading}
        meta={meta}
      >
        {customers.map((item) => (
          <Table.Row
            cursor="pointer"
            key={item.id}
            onClick={() => handleCustomerSelect(item)}
          >
            <Table.Cell minW={200}>
              <Text lineClamp={1}>{displayValue(item.name)}</Text>
            </Table.Cell>
            <Table.Cell minW={200}>
              <Text lineClamp={1}>{normalizeText(item.email, 30)}</Text>
            </Table.Cell>
            <Table.Cell minW={200}>
              <Text lineClamp={1}>
                {formatOrPlaceholder(item.phone, formatTelefone)}
              </Text>
            </Table.Cell>
            <Table.Cell>
              {item.whatsappOptin ? (
                <Badge
                  colorPalette="green"
                  variant="solid"
                >
                  <RiCheckboxCircleLine /> Sim
                </Badge>
              ) : (
                <Badge
                  colorPalette="red"
                  variant="solid"
                >
                  <RiCloseCircleLine /> Não
                </Badge>
              )}
            </Table.Cell>
            <Table.Cell>
              <Badge
                colorPalette="gray"
                variant="solid"
              >
                {displayValue(clientTypeMap[item.rfvClassification], EMPTY_PLACEHOLDER)}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              <Badge
                colorPalette="orange"
                variant="solid"
              >
                Bronze
              </Badge>
            </Table.Cell>
          </Table.Row>
        ))}
      </CustomTable>
      {selectedCustomer && (
        <CustomerDetailsDrawer
          data={selectedCustomer}
          onClose={handleCustomerClose}
        />
      )}
    </>
  )
}
