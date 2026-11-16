import {
  Badge,
  Box,
  Button,
  Dialog,
  Flex,
  IconButton,
  Input,
  InputGroup,
  Menu,
  Portal,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { type ReactNode,useCallback, useEffect, useMemo, useState } from 'react'
import {
  LuArrowDownUp,
  LuArrowUpDown,
  LuCake,
  LuCalendarDays,
  LuEllipsis,
  LuMail,
  LuMessageCircle,
  LuShoppingBag,
} from 'react-icons/lu'
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
  ExportCustomersButton,
  ImportCustomersWizard,
  ImportWhatsAppCustomersModal,
  LoadingState,
  TablePagination,
} from '@/components'
import { MultiSelectFilter } from '@/components/features/campaigns/recurring-campaign/RecurringCampaignDetailsView/MultiSelectFilter'
import { RfvMatrix } from '@/components/features/customers'
import { CustomerDetailsModal } from '@/components/features/customers/CustomerDetailsModal'
import { useShellMode } from '@/components/layout/AppLayout/useShellMode'
import { Tooltip } from '@/components/ui/tooltip'
import { useAuth } from '@/context/AuthContext'
import { useCustomers } from '@/hooks/queries'
import { useWhatsAppManager } from '@/hooks/useWhatsAppManager'
import type { Customer } from '@/types'
import type { RfvSegmentCategory } from '@/utils/constants/rfvMatrix/categories'
import {
  getCustomerCategoryKey,
  getCustomerCategoryLabel,
  isLeadCategory,
} from '@/utils/customers/customerCategory'
import { MONTH_OPTIONS } from '@/utils/date/monthOptions'
import { formatTelefone } from '@/utils/mask'
import {
  displayValue,
  EMPTY_PLACEHOLDER,
  formatOrPlaceholder,
  normalizeText,
} from '@/utils/strings'
import { CustomerDetailsModal as WhiteLabelCustomerDetailsModal } from '@/whitelabel/components/CustomerDetailsModal'

import {
  clearBirthMonthForFilter,
  formatCustomerBirthDate,
  isBirthMonthVisible,
} from './customerBirthdayFilters'
import { CustomerPhoneList } from './CustomerPhoneList'

type BoolFilter = 'true' | 'false'
type OrderByFilter =
  | 'createdAt'
  | 'name'
  | 'birthDate'
  | 'lastOrderDate'
  | 'averageTicket'
  | 'updatedAt'
type OrderDirectionFilter = 'asc' | 'desc'

type ListFilters = {
  hasEmail: BoolFilter[]
  hasBirthDate: BoolFilter[]
  birthMonth?: number
  whatsappOptin: BoolFilter[]
  whatsappVerified: BoolFilter[]
  hasOrders: BoolFilter[]
  orderBy: OrderByFilter[]
  orderDirection: OrderDirectionFilter[]
}

interface CustomerTableSectionProps {
  rfvClassifications?: string[]
  filterExtra?: ReactNode
}

const DEFAULT_FILTERS: ListFilters = {
  hasEmail: [],
  hasBirthDate: [],
  birthMonth: undefined,
  whatsappOptin: [],
  whatsappVerified: [],
  hasOrders: [],
  orderBy: [],
  orderDirection: [],
}

const EMAIL_OPTIONS = [
  { value: 'true' as const, label: 'Com e-mail', icon: <LuMail size={14} /> },
  { value: 'false' as const, label: 'Sem e-mail' },
]

const BIRTHDATE_OPTIONS = [
  { value: 'true' as const, label: 'Com data', icon: <LuCake size={14} /> },
  { value: 'false' as const, label: 'Sem data' },
]

const OPTIN_OPTIONS = [
  {
    value: 'true' as const,
    label: 'Com opt-in',
    icon: <LuMessageCircle size={14} />,
  },
  { value: 'false' as const, label: 'Sem opt-in' },
]

const VERIFIED_OPTIONS = [
  {
    value: 'true' as const,
    label: 'Verificado',
    icon: <RiWhatsappLine size={14} />,
  },
  { value: 'false' as const, label: 'Não verificado' },
]

const ORDERS_OPTIONS = [
  {
    value: 'true' as const,
    label: 'Com vendas',
    icon: <LuShoppingBag size={14} />,
  },
  { value: 'false' as const, label: 'Leads (sem vendas)' },
]

const ORDER_BY_OPTIONS = [
  { value: 'createdAt' as const, label: 'Data de cadastro' },
  { value: 'name' as const, label: 'Nome' },
  { value: 'birthDate' as const, label: 'Data de nascimento' },
  { value: 'lastOrderDate' as const, label: 'Última venda' },
  { value: 'averageTicket' as const, label: 'Ticket médio' },
  { value: 'updatedAt' as const, label: 'Atualização' },
]

const MONTH_FILTER_OPTIONS = MONTH_OPTIONS.map(({ value, label }) => ({
  value: String(value),
  label,
}))

const ORDER_DIRECTION_OPTIONS = [
  { value: 'desc' as const, label: 'Decrescente' },
  { value: 'asc' as const, label: 'Crescente' },
]

/** Mantém seleção exclusiva (uma opção) para filtros mutuamente exclusivos. */
function exclusiveSelect<T extends string>(next: T[], previous: T[]): T[] {
  if (next.length === 0) return []
  if (next.length === 1) return next
  const added = next.find((value) => !previous.includes(value))
  return [added ?? next[next.length - 1]]
}

function firstBool(values: BoolFilter[]): boolean | undefined {
  if (values[0] === 'true') return true
  if (values[0] === 'false') return false
  return undefined
}

// Componente reutilizável com a tabela de clientes
export function CustomerTableSection({
  rfvClassifications,
  filterExtra,
}: CustomerTableSectionProps) {
  const { selectedCompany } = useAuth()
  const { isConnected: isWhatsAppConnected } = useWhatsAppManager(
    selectedCompany?.id
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [filters, setFilters] = useState<ListFilters>(DEFAULT_FILTERS)
  const [params, setParams] = useState({
    page: 1,
    limit: 10,
  })
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  )
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const shell = useShellMode()
  const phone = shell === 'phone'

  useEffect(() => {
    setParams((prev) => ({ ...prev, page: 1 }))
  }, [rfvClassifications, filters])

  const queryParams = useMemo(() => {
    const hasFilter = rfvClassifications && rfvClassifications.length > 0
    const hasEmail = firstBool(filters.hasEmail)
    const hasBirthDate = firstBool(filters.hasBirthDate)
    const whatsappOptin = firstBool(filters.whatsappOptin)
    const whatsappVerified = firstBool(filters.whatsappVerified)
    const hasOrders = firstBool(filters.hasOrders)

    return {
      ...params,
      orderBy: filters.orderBy[0] ?? 'createdAt',
      orderDirection: filters.orderDirection[0] ?? 'desc',
      ...(debouncedSearchQuery && { name: debouncedSearchQuery }),
      ...(hasFilter && { rfvClassification: rfvClassifications }),
      ...(hasEmail !== undefined && { hasEmail }),
      ...(hasBirthDate !== undefined && { hasBirthDate }),
      ...(filters.birthMonth !== undefined && {
        birthMonth: filters.birthMonth,
      }),
      ...(whatsappOptin !== undefined && { whatsappOptin }),
      ...(whatsappVerified !== undefined && { whatsappVerified }),
      ...(hasOrders !== undefined && { hasOrders }),
    }
  }, [params, debouncedSearchQuery, rfvClassifications, filters])

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

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleSearch(e.target.value)
    },
    [handleSearch]
  )

  const updateExclusiveFilter = useCallback(
    <K extends keyof ListFilters>(key: K, next: ListFilters[K]) => {
      setFilters((prev) => ({
        ...prev,
        [key]: exclusiveSelect(next as string[], prev[key] as string[]),
      }))
    },
    []
  )

  const handleBirthDateFilterChange = useCallback((next: BoolFilter[]) => {
    setFilters((prev) => {
      const nextHasBirthDate = exclusiveSelect(next, prev.hasBirthDate)
      return {
        ...prev,
        hasBirthDate: nextHasBirthDate,
        birthMonth: clearBirthMonthForFilter(nextHasBirthDate, prev.birthMonth),
      }
    })
  }, [])

  const handleBirthMonthChange = useCallback((next: string[]) => {
    setFilters((prev) => {
      const previous =
        prev.birthMonth !== undefined ? [String(prev.birthMonth)] : []
      const [selected] = exclusiveSelect(next, previous)
      return {
        ...prev,
        birthMonth: selected ? Number(selected) : undefined,
      }
    })
  }, [])

  const birthMonthValue = useMemo(
    () =>
      filters.birthMonth !== undefined ? [String(filters.birthMonth)] : [],
    [filters.birthMonth]
  )

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setSearchQuery('')
    setDebouncedSearchQuery('')
  }, [])

  const handleOpenWhatsAppModal = useCallback(() => {
    setIsWhatsAppModalOpen(true)
  }, [])

  const handleCloseWhatsAppModal = useCallback(() => {
    setIsWhatsAppModalOpen(false)
  }, [])

  const isWhiteLabel = import.meta.env.VITE_THEME_ID !== 'default'
  const CustomerModal = isWhiteLabel
    ? WhiteLabelCustomerDetailsModal
    : CustomerDetailsModal

  const showClearFilters =
    searchQuery.trim().length > 0 ||
    filters.hasEmail.length > 0 ||
    filters.hasBirthDate.length > 0 ||
    filters.birthMonth !== undefined ||
    filters.whatsappOptin.length > 0 ||
    filters.whatsappVerified.length > 0 ||
    filters.hasOrders.length > 0 ||
    filters.orderBy.length > 0 ||
    filters.orderDirection.length > 0

  const sortLabel =
    ORDER_BY_OPTIONS.find((option) => option.value === filters.orderBy[0])
      ?.label ?? 'Cadastro'
  const activeFilterCount = [
    filters.hasEmail.length,
    filters.hasBirthDate.length,
    filters.birthMonth !== undefined ? 1 : 0,
    filters.whatsappOptin.length,
    filters.whatsappVerified.length,
    filters.hasOrders.length,
    rfvClassifications?.length ?? 0,
  ].reduce((sum, value) => sum + value, 0)

  const filterControls = (
      <Flex
        align="center"
        display="flex"
        gap={2}
        wrap="wrap"
      >
        <MultiSelectFilter
          icon={<LuMail size={14} />}
          label="E-mail"
          minH="44px"
          onChange={(next) => updateExclusiveFilter('hasEmail', next)}
          options={EMAIL_OPTIONS}
          placeholder="Todos"
          value={filters.hasEmail}
        />
        <MultiSelectFilter
          icon={<LuCake size={14} />}
          label="Aniversário"
          minH="44px"
          onChange={handleBirthDateFilterChange}
          options={BIRTHDATE_OPTIONS}
          placeholder="Todos"
          value={filters.hasBirthDate}
        />
        {isBirthMonthVisible(filters.hasBirthDate) && (
          <MultiSelectFilter
          icon={<LuCalendarDays size={14} />}
            label="Mês"
            minH="44px"
            onChange={handleBirthMonthChange}
            options={MONTH_FILTER_OPTIONS}
            placeholder="Todos"
            value={birthMonthValue}
          />
        )}
        <MultiSelectFilter
          icon={<LuMessageCircle size={14} />}
          label="Opt-in"
          minH="44px"
          onChange={(next) => updateExclusiveFilter('whatsappOptin', next)}
          options={OPTIN_OPTIONS}
          placeholder="Todos"
          value={filters.whatsappOptin}
        />
        <MultiSelectFilter
          icon={<RiWhatsappLine size={14} />}
          label="WhatsApp"
          minH="44px"
          onChange={(next) => updateExclusiveFilter('whatsappVerified', next)}
          options={VERIFIED_OPTIONS}
          placeholder="Todos"
          value={filters.whatsappVerified}
        />
        <MultiSelectFilter
          icon={<LuShoppingBag size={14} />}
          label="Vendas"
          minH="44px"
          onChange={(next) => updateExclusiveFilter('hasOrders', next)}
          options={ORDERS_OPTIONS}
          placeholder="Todos"
          value={filters.hasOrders}
        />
        <MultiSelectFilter
          icon={<LuArrowDownUp size={14} />}
          label="Ordenar"
          minH="44px"
          onChange={(next) => updateExclusiveFilter('orderBy', next)}
          options={ORDER_BY_OPTIONS}
          placeholder="Cadastro"
          value={filters.orderBy}
        />
        <MultiSelectFilter
          icon={<LuArrowUpDown size={14} />}
          label="Direção"
          minH="44px"
          onChange={(next) => updateExclusiveFilter('orderDirection', next)}
          options={ORDER_DIRECTION_OPTIONS}
          placeholder="Decrescente"
          value={filters.orderDirection}
        />

        {showClearFilters && (
          <Box
            _hover={{ color: 'fg' }}
            as="button"
            color="fg.muted"
            fontSize="xs"
            fontWeight="medium"
            onClick={handleClearFilters}
            px={2}
            py={1}
            rounded="md"
            textDecoration="underline"
            transition="color 120ms ease"
          >
            Limpar filtros
          </Box>
        )}
      </Flex>
  )

  return (
    <Stack gap={3}>
      {phone ? (
        <Stack gap={2}>
          <Flex gap={2}>
            <InputGroup flex={1}>
          <Input
            bg="bg.panel"
            h="44px"
            minH="44px"
            onChange={handleSearchChange}
            placeholder="Buscar nome ou telefone"
            rounded="lg"
            value={searchQuery}
          />
            </InputGroup>
            <Button
              aria-label="Filtros"
              h="44px"
              minH="44px"
              minW="44px"
              onClick={() => setFiltersOpen(true)}
              position="relative"
              variant="outline"
            >
              Filtros
              {activeFilterCount > 0 ? (
                <Badge
                  colorPalette="orange"
                  position="absolute"
                  right="-4px"
                  top="-4px"
                >
                  {activeFilterCount}
                </Badge>
              ) : null}
            </Button>
            <Menu.Root>
              <Menu.Trigger asChild>
                <IconButton
                  aria-label="Mais ações"
                  minH="44px"
                  minW="44px"
                  variant="outline"
                >
                  <LuEllipsis />
                </IconButton>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content minW="220px" p={2}>
                    <Stack gap={2}>
                      <Button
                        colorPalette="green"
                        disabled={!isWhatsAppConnected}
                        onClick={handleOpenWhatsAppModal}
                        variant="surface"
                        w="full"
                      >
                        <RiWhatsappLine />
                        Importar Clientes
                      </Button>
                      <ImportCustomersWizard />
                      <ExportCustomersButton />
                      <CreateCustomerForm />
                    </Stack>
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
          </Flex>
          <Flex
            fontSize="13px"
            justify="space-between"
          >
            <Text color="fg.muted">{meta?.total ?? customers.length} clientes</Text>
            <Text color="fg.muted">Ordenar: {sortLabel}</Text>
          </Flex>
          {isLoading ? (
            <LoadingState title="Carregando clientes..." />
          ) : (
            <CustomerPhoneList
              customers={customers}
              onSelect={handleCustomerSelect}
            />
          )}
          <Dialog.Root
            onOpenChange={(details) => setFiltersOpen(details.open)}
            open={filtersOpen}
            placement="bottom"
          >
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>Filtros</Dialog.Title>
                  <Dialog.CloseTrigger />
                </Dialog.Header>
                <Dialog.Body>
                  <Stack gap={3}>
                    {filterExtra}
                    {filterControls}
                  </Stack>
                </Dialog.Body>
                <Dialog.Footer>
                  <Button
                    flex="1"
                    minH="44px"
                    onClick={handleClearFilters}
                    variant="outline"
                  >
                    Limpar
                  </Button>
                  <Button
                    flex="1"
                    minH="44px"
                    onClick={() => setFiltersOpen(false)}
                  >
                    Ver {meta?.total ?? customers.length} clientes
                  </Button>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Positioner>
          </Dialog.Root>
        </Stack>
      ) : null}
      {!phone && filterControls}


      <Flex
        alignItems="center"
        display={phone ? 'none' : 'flex'}
        flexDirection={{ base: 'column', md: 'row' }}
        gap={2}
      >
        <InputGroup flex={1}>
          <Input
            bg="bg.panel"
            borderColor="border.emphasized"
            minH="44px"
            onChange={handleSearchChange}
            placeholder="Buscar por nome, telefone ou e-mail..."
            rounded="lg"
            shadow="xs"
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
        <ExportCustomersButton />
        <CreateCustomerForm />
      </Flex>

      <Box display={phone ? 'none' : 'block'}>
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
            <Table.ColumnHeader>Nascimento</Table.ColumnHeader>
            <Table.ColumnHeader>Whatsapp Optin</Table.ColumnHeader>
            <Table.ColumnHeader>Classificação</Table.ColumnHeader>
          </>
        }
        isLoading={isLoading}
        meta={meta}
        stickyFirstColumn={shell === 'tablet'}
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
            <Table.Cell minW={140}>
              {formatCustomerBirthDate(item.birthDate)}
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
                colorPalette={
                  isLeadCategory(getCustomerCategoryKey(item)) ? 'blue' : 'gray'
                }
                variant="solid"
              >
                {displayValue(
                  getCustomerCategoryLabel(item),
                  EMPTY_PLACEHOLDER
                )}
              </Badge>
            </Table.Cell>
          </Table.Row>
        ))}
      </CustomTable>
      </Box>
      {phone && meta ? (
        <TablePagination
          data={customers}
          handleLimitChange={handleLimitChange}
          handlePageChange={handlePageChange}
          meta={meta}
        />
      ) : null}
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
    </Stack>
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
