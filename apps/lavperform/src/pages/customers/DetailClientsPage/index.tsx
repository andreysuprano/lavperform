import {
  Badge,
  Button,
  Flex,
  Input,
  InputGroup,
  Table,
  Text,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiUserCommunityLine,
  RiWhatsappLine,
} from 'react-icons/ri'

import {
  AppContentLayout,
  CreateCustomerForm,
  CustomTable,
  ImportCustomersWizard,
  ImportWhatsAppCustomersModal,
} from '@/components'
import { Tooltip } from '@/components/ui/tooltip'
import { CustomerDetailsModal } from '@/components/features/customers/CustomerDetailsModal'
import { CustomerDetailsModal as WhiteLabelCustomerDetailsModal } from '@/whitelabel/components/CustomerDetailsModal'
import { RfvMatrix } from '@/components/features/customers'
import { useAuth } from '@/context/AuthContext'
import { useCustomers } from '@/hooks/queries'
import { useWhatsAppManager } from '@/hooks/useWhatsAppManager'
import type { Customer } from '@/types'
import { clientTypesOptions } from '@/utils/constants/clientType'
import { RFV_SEGMENT_CATEGORIES } from '@/utils/constants/rfvMatrix'
import type { RfvSegmentCategory } from '@/utils/constants/rfvMatrix/categories'
import { formatTelefone } from '@/utils/mask'
import {
  displayValue,
  EMPTY_PLACEHOLDER,
  formatOrPlaceholder,
  normalizeText,
} from '@/utils/strings'

interface CustomerTableSectionProps {
  rfvClassifications?: string[]
}

// Componente reutilizável com a tabela de clientes
export function CustomerTableSection({
  rfvClassifications,
}: CustomerTableSectionProps) {
  const { selectedCompany } = useAuth()
  const { isConnected: isWhatsAppConnected } = useWhatsAppManager(
    selectedCompany?.id
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [params, setParams] = useState({
    page: 1,
    limit: 10,
    orderBy: 'createdAt',
    orderDirection: 'desc' as 'asc' | 'desc',
  })
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  )
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)

  useEffect(() => {
    setParams((prev) => ({ ...prev, page: 1 }))
  }, [rfvClassifications])

  const queryParams = useMemo(() => {
    const hasFilter = rfvClassifications && rfvClassifications.length > 0
    return {
      ...params,
      ...(debouncedSearchQuery && { name: debouncedSearchQuery }),
      ...(hasFilter && { rfvClassification: rfvClassifications }),
    }
  }, [params, debouncedSearchQuery, rfvClassifications])

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

  const handleOpenWhatsAppModal = useCallback(() => {
    setIsWhatsAppModalOpen(true)
  }, [])

  const handleCloseWhatsAppModal = useCallback(() => {
    setIsWhatsAppModalOpen(false)
  }, [])

  // Determinar o componente usar baseado no env
  const isWhiteLabel = import.meta.env.VITE_THEME_ID !== 'default'
  const CustomerModal = isWhiteLabel
    ? WhiteLabelCustomerDetailsModal
    : CustomerDetailsModal

  return (
    <>
      <Flex
        alignItems="center"
        flexDirection={{ base: 'column', md: 'row' }}
        gap={2}
      >
        <InputGroup>
          <Input
            onChange={handleSearchChange}
            placeholder="Pesquisar cliente..."
            value={searchQuery}
          />
        </InputGroup>
        <Tooltip
          content={
            !isWhatsAppConnected
              ? 'Conecte o WhatsApp para importar clientes'
              : ''
          }
          disabled={isWhatsAppConnected}
        >
          <Button
            colorPalette="green"
            disabled={!isWhatsAppConnected}
            onClick={handleOpenWhatsAppModal}
            variant="surface"
            w={{ base: 'full', md: 'auto' }}
          >
            <RiWhatsappLine />
            Importar Clientes
          </Button>
        </Tooltip>
        <ImportCustomersWizard />
        <CreateCustomerForm />
      </Flex>
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
        <CustomerModal
          data={selectedCustomer}
          isOpen={!!selectedCustomer}
          onClose={handleCustomerClose}
        />
      )}
      {selectedCompany && (
        <ImportWhatsAppCustomersModal
          companyId={selectedCompany.id}
          isOpen={isWhatsAppModalOpen}
          onClose={handleCloseWhatsAppModal}
        />
      )}
    </>
  )
}

// Página completa com layout (para usar na rota)
export function DetailClientsPage() {
  const { selectedCompany } = useAuth()
  const [selectedCategories, setSelectedCategories] = useState<
    RfvSegmentCategory[]
  >([])

  const handleCategoryToggle = useCallback((categoryId: RfvSegmentCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    )
  }, [])

  const rfvClassifications = useMemo(() => {
    if (selectedCategories.length === 0) return undefined
    return selectedCategories.flatMap(
      (catId) =>
        RFV_SEGMENT_CATEGORIES.find((c) => c.id === catId)?.segments ?? []
    )
  }, [selectedCategories])

  return (
    <AppContentLayout
      icon={<RiUserCommunityLine />}
      title="Matriz RFV"
    >
      <RfvMatrix
        companyId={selectedCompany?.id}
        onCategoryToggle={handleCategoryToggle}
        selectedCategories={selectedCategories}
      />
    </AppContentLayout>
  )
}
