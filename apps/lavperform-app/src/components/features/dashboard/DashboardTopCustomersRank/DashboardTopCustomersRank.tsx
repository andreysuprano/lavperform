import {
  Avatar,
  Badge,
  Box,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo, useMemo, useState } from 'react'
import { LuCrown, LuShoppingBag, LuTrophy } from 'react-icons/lu'

import { Empty } from '@/components/common'
import { CustomerDetailsModal } from '@/components/features/customers/CustomerDetailsModal'
import { useWhiteLabel } from '@/config'
import { useAuth } from '@/context/AuthContext'
import { useTopBuyers } from '@/hooks/queries'
import type { Customer, TopBuyerCustomer } from '@/types'
import { clientTypesOptions } from '@/utils/constants/clientType'
import { formatTelefone } from '@/utils/mask'
import { formatCurrency } from '@/utils/money'
import { getInitials } from '@/utils/strings'

const RANK_LIMIT = 10
const VISIBLE_ITEMS = 5
const MONTHLY_CARD_MIN_W = '168px'

const RANK_STYLES = [
  { bg: 'yellow.subtle', color: 'yellow.fg', icon: LuCrown },
  { bg: 'gray.subtle', color: 'gray.fg', icon: LuTrophy },
  { bg: 'orange.subtle', color: 'orange.fg', icon: LuTrophy },
] as const

type RankSortBy = 'totalSpent' | 'orderCount'

function getCurrentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    label: new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
    }).format(now),
  }
}

function getRfvLabel(classification: string | null) {
  if (!classification) return null
  return (
    clientTypesOptions.items.find((item) => item.value === classification)
      ?.label ?? classification
  )
}

function formatLastOrder(date: string | null) {
  if (!date) return 'Sem data'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(date))
}

function toCustomer(buyer: TopBuyerCustomer): Customer {
  return {
    id: buyer.customerId,
    name: buyer.name,
    phone: buyer.phone,
    email: buyer.email,
    birthDate: buyer.birthDate,
    lastOrderDate: buyer.lastOrderDate,
    rfvClassification: buyer.rfvClassification ?? '',
    whatsappOptin: buyer.whatsappOptin,
    averageTicket: buyer.averageTicket,
    companyId: buyer.companyId,
    createdAt: buyer.createdAt,
    updatedAt: buyer.updatedAt,
  }
}

function getMetricValue(buyer: TopBuyerCustomer, sortBy: RankSortBy) {
  return sortBy === 'orderCount' ? buyer.orderCount : buyer.totalSpent
}

function formatMetric(buyer: TopBuyerCustomer, sortBy: RankSortBy) {
  if (sortBy === 'orderCount') {
    return `${buyer.orderCount} ${buyer.orderCount === 1 ? 'venda' : 'vendas'}`
  }
  return formatCurrency(buyer.totalSpent)
}

type MonthlyTopStripProps = {
  data: TopBuyerCustomer[] | undefined
  isLoading: boolean
  isError: boolean
  monthLabel: string
  colorPalette: string
  onOpenDetails: (buyer: TopBuyerCustomer) => void
}

function MonthlyTopStrip({
  data,
  isLoading,
  isError,
  monthLabel,
  colorPalette,
  onOpenDetails,
}: MonthlyTopStripProps) {
  const capitalizedMonth =
    monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

  return (
    <Box
      bg="bg.panel"
      borderColor="border"
      borderRadius="lg"
      borderWidth="1px"
      colorPalette={colorPalette}
      overflow="hidden"
      p={3}
      w="full"
    >
      <Stack
        gap={0.5}
        mb={3}
      >
        <Heading
          fontWeight="semibold"
          size="sm"
        >
          Top Clientes do mês
        </Heading>
        <Text
          color="fg.muted"
          fontSize="xs"
        >
          Quem mais comprou em {capitalizedMonth}
        </Text>
      </Stack>

      {isLoading ? (
        <HStack
          gap={2}
          overflowX="auto"
          pb={1}
        >
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton
              borderRadius="md"
              flexShrink={0}
              h="112px"
              key={idx}
              minW={MONTHLY_CARD_MIN_W}
            />
          ))}
        </HStack>
      ) : isError ? (
        <Empty
          description="Não foi possível carregar o ranking do mês."
          title="Erro ao carregar"
        />
      ) : !data || data.length === 0 ? (
        <Empty
          description="Nenhuma compra neste mês."
          title="Sem vendas no período"
        />
      ) : (
        <HStack
          align="stretch"
          css={{
            '&::-webkit-scrollbar': { height: '6px' },
            '&::-webkit-scrollbar-thumb': {
              background: 'var(--chakra-colors-border)',
              borderRadius: '999px',
            },
          }}
          gap={2}
          overflowX="auto"
          pb={1}
        >
          {data.map((buyer, index) => {
            const rank = index + 1
            const rankStyle = RANK_STYLES[index]
            const RankIcon = rankStyle?.icon

            return (
              <Box
                _hover={{
                  borderColor: 'colorPalette.solid',
                  bg: 'bg.subtle',
                }}
                bg="bg"
                borderColor="border"
                borderRadius="md"
                borderWidth="1px"
                cursor="pointer"
                flexShrink={0}
                key={buyer.customerId}
                minW={MONTHLY_CARD_MIN_W}
                onClick={() => onOpenDetails(buyer)}
                px={2.5}
                py={2.5}
                transition="border-color 0.15s ease, background 0.15s ease"
                w={MONTHLY_CARD_MIN_W}
              >
                <Stack
                  align="center"
                  gap={2}
                  textAlign="center"
                >
                  <Flex
                    align="center"
                    bg={rankStyle?.bg ?? 'bg.muted'}
                    borderRadius="md"
                    color={rankStyle?.color ?? 'fg.muted'}
                    fontSize="xs"
                    fontWeight="bold"
                    h={7}
                    justify="center"
                    w={7}
                  >
                    {RankIcon && rank <= 3 ? (
                      <RankIcon size={14} />
                    ) : (
                      rank
                    )}
                  </Flex>

                  <Avatar.Root size="sm">
                    <Avatar.Fallback name={buyer.name}>
                      {getInitials(buyer.name)}
                    </Avatar.Fallback>
                  </Avatar.Root>

                  <Text
                    fontSize="xs"
                    fontWeight="semibold"
                    lineClamp={1}
                    w="full"
                  >
                    {buyer.name}
                  </Text>

                  <Badge
                    colorPalette={colorPalette}
                    size="sm"
                    variant="subtle"
                  >
                    {buyer.orderCount}{' '}
                    {buyer.orderCount === 1 ? 'venda' : 'vendas'}
                  </Badge>
                </Stack>
              </Box>
            )
          })}
        </HStack>
      )}
    </Box>
  )
}

type RankListProps = {
  title: string
  subtitle: string
  sortBy: RankSortBy
  data: TopBuyerCustomer[] | undefined
  isLoading: boolean
  isError: boolean
  expandedId: string | null
  onExpand: (customerId: string | null) => void
  onOpenDetails: (buyer: TopBuyerCustomer) => void
  colorPalette: string
}

function RankList({
  title,
  subtitle,
  sortBy,
  data,
  isLoading,
  isError,
  expandedId,
  onExpand,
  onOpenDetails,
  colorPalette,
}: RankListProps) {
  const maxMetric = useMemo(
    () => Math.max(...(data?.map((item) => getMetricValue(item, sortBy)) ?? [0]), 1),
    [data, sortBy]
  )

  if (isLoading) {
    return (
      <Box
        bg="bg.panel"
        borderColor="border"
        borderRadius="lg"
        borderWidth="1px"
        p={3}
        w="full"
      >
        <Stack gap={2}>
          <Skeleton height="20px" w="160px" />
          <Skeleton height="14px" w="200px" />
          {Array.from({ length: VISIBLE_ITEMS }).map((_, idx) => (
            <Skeleton
              borderRadius="md"
              height="52px"
              key={idx}
            />
          ))}
        </Stack>
      </Box>
    )
  }

  if (isError) {
    return (
      <Box
        bg="bg.panel"
        borderColor="border"
        borderRadius="lg"
        borderWidth="1px"
        p={3}
        w="full"
      >
        <Empty
          description="Não foi possível carregar este ranking."
          title="Erro ao carregar"
        />
      </Box>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Box
        bg="bg.panel"
        borderColor="border"
        borderRadius="lg"
        borderWidth="1px"
        p={3}
        w="full"
      >
        <Empty
          description="Quando houver vendas, o ranking aparece aqui."
          title="Nenhum ranking ainda"
        />
      </Box>
    )
  }

  return (
    <Box
      bg="bg.panel"
      borderColor="border"
      borderRadius="lg"
      borderWidth="1px"
      colorPalette={colorPalette}
      display="flex"
      flexDirection="column"
      overflow="hidden"
      p={3}
      w="full"
    >
      <Stack
        flexShrink={0}
        gap={0.5}
        mb={3}
      >
        <Heading
          fontWeight="semibold"
          size="sm"
        >
          {title}
        </Heading>
        <Text
          color="fg.muted"
          fontSize="xs"
        >
          {subtitle}
        </Text>
      </Stack>

      <Box
        css={{
          '&::-webkit-scrollbar': { width: '6px' },
          '&::-webkit-scrollbar-thumb': {
            background: 'var(--chakra-colors-border)',
            borderRadius: '999px',
          },
        }}
        maxH="320px"
        overflowY="auto"
        pr={1}
      >
        <Stack gap={1.5}>
          {data.map((buyer, index) => {
            const rank = index + 1
            const isExpanded = expandedId === `${sortBy}:${buyer.customerId}`
            const rankStyle = RANK_STYLES[index]
            const RankIcon = rankStyle?.icon
            const metric = getMetricValue(buyer, sortBy)
            const progress = Math.round((metric / maxMetric) * 100)
            const rfvLabel = getRfvLabel(buyer.rfvClassification)

            return (
              <Box
                _hover={{
                  borderColor: 'colorPalette.solid',
                  bg: 'bg.subtle',
                }}
                bg={isExpanded ? 'bg.subtle' : 'bg'}
                borderColor={isExpanded ? 'colorPalette.solid' : 'border'}
                borderRadius="md"
                borderWidth="1px"
                cursor="pointer"
                key={`${sortBy}-${buyer.customerId}`}
                onClick={() =>
                  onExpand(isExpanded ? null : `${sortBy}:${buyer.customerId}`)
                }
                overflow="hidden"
                px={2.5}
                py={2}
                transition="border-color 0.15s ease, background 0.15s ease"
              >
                <Flex
                  align="center"
                  gap={2}
                >
                  <Flex
                    align="center"
                    bg={rankStyle?.bg ?? 'bg.muted'}
                    borderRadius="md"
                    color={rankStyle?.color ?? 'fg.muted'}
                    flexShrink={0}
                    fontSize="xs"
                    fontWeight="bold"
                    h={7}
                    justify="center"
                    w={7}
                  >
                    {RankIcon && rank <= 3 ? (
                      <RankIcon size={14} />
                    ) : (
                      rank
                    )}
                  </Flex>

                  <Avatar.Root size="xs">
                    <Avatar.Fallback name={buyer.name}>
                      {getInitials(buyer.name)}
                    </Avatar.Fallback>
                  </Avatar.Root>

                  <VStack
                    align="stretch"
                    flex={1}
                    gap={0.5}
                    minW={0}
                  >
                    <HStack
                      justify="space-between"
                      w="full"
                    >
                      <Text
                        fontSize="xs"
                        fontWeight="semibold"
                        lineClamp={1}
                      >
                        {buyer.name}
                      </Text>
                      <Text
                        color="fg"
                        flexShrink={0}
                        fontSize="xs"
                        fontVariantNumeric="tabular-nums"
                        fontWeight="bold"
                      >
                        {formatMetric(buyer, sortBy)}
                      </Text>
                    </HStack>

                    <Box
                      bg="bg.muted"
                      borderRadius="full"
                      h="4px"
                      overflow="hidden"
                      w="full"
                    >
                      <Box
                        bg="colorPalette.solid"
                        borderRadius="full"
                        h="full"
                        transition="width 0.25s ease"
                        w={`${progress}%`}
                      />
                    </Box>

                    <HStack
                      color="fg.muted"
                      flexWrap="wrap"
                      fontSize="2xs"
                      gap={1.5}
                    >
                      {sortBy === 'totalSpent' ? (
                        <HStack gap={0.5}>
                          <LuShoppingBag size={10} />
                          <Text as="span">
                            {buyer.orderCount}{' '}
                            {buyer.orderCount === 1 ? 'venda' : 'vendas'}
                          </Text>
                        </HStack>
                      ) : (
                        <Text as="span">{formatCurrency(buyer.totalSpent)}</Text>
                      )}
                      <Text as="span">
                        Ticket {formatCurrency(buyer.averageTicket)}
                      </Text>
                      {rfvLabel ? (
                        <Badge
                          colorPalette="gray"
                          size="sm"
                          variant="subtle"
                        >
                          {rfvLabel}
                        </Badge>
                      ) : null}
                    </HStack>
                  </VStack>
                </Flex>

                {isExpanded ? (
                  <Stack
                    borderColor="border"
                    borderTopWidth="1px"
                    gap={2}
                    mt={2}
                    onClick={(event) => event.stopPropagation()}
                    pt={2}
                  >
                    <HStack
                      flexWrap="wrap"
                      gap={3}
                      justify="space-between"
                    >
                      <Stack gap={0}>
                        <Text
                          color="fg.muted"
                          fontSize="2xs"
                        >
                          Telefone
                        </Text>
                        <Text fontSize="xs" fontWeight="medium">
                          {buyer.phone
                            ? formatTelefone(buyer.phone)
                            : 'Não informado'}
                        </Text>
                      </Stack>
                      <Stack gap={0}>
                        <Text
                          color="fg.muted"
                          fontSize="2xs"
                        >
                          Última venda
                        </Text>
                        <Text fontSize="xs" fontWeight="medium">
                          {formatLastOrder(buyer.lastOrderDate)}
                        </Text>
                      </Stack>
                      <Stack gap={0}>
                        <Text
                          color="fg.muted"
                          fontSize="2xs"
                        >
                          E-mail
                        </Text>
                        <Text fontSize="xs" fontWeight="medium" lineClamp={1}>
                          {buyer.email || 'Não informado'}
                        </Text>
                      </Stack>
                    </HStack>

                    <Text
                      _hover={{ color: 'colorPalette.fg' }}
                      color="fg"
                      cursor="pointer"
                      fontSize="xs"
                      fontWeight="semibold"
                      textDecoration="underline"
                      textUnderlineOffset="3px"
                      w="fit-content"
                      onClick={() => onOpenDetails(buyer)}
                    >
                      Ver ficha completa
                    </Text>
                  </Stack>
                ) : null}
              </Box>
            )
          })}
        </Stack>
      </Box>
    </Box>
  )
}

function DashboardTopCustomersRankBase() {
  const { colorPalette } = useWhiteLabel()
  const { selectedCompany } = useAuth()
  const monthRange = useMemo(() => getCurrentMonthRange(), [])
  const bySpent = useTopBuyers(selectedCompany?.id, RANK_LIMIT, 'totalSpent')
  const byOrders = useTopBuyers(selectedCompany?.id, RANK_LIMIT, 'orderCount')
  const byMonth = useTopBuyers(
    selectedCompany?.id,
    RANK_LIMIT,
    'orderCount',
    monthRange.startDate,
    monthRange.endDate
  )
  const [selected, setSelected] = useState<Customer | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const openDetails = (buyer: TopBuyerCustomer) => {
    setSelected(toCustomer(buyer))
  }

  return (
    <Box
      colorPalette={colorPalette}
      w="full"
    >
      <Stack
        gap={0.5}
        mb={3}
      >
        <Heading
          fontWeight="semibold"
          size="md"
        >
          Rankings de clientes
        </Heading>
        <Text
          color="fg.muted"
          fontSize="sm"
        >
          Top {RANK_LIMIT} por valor gasto e por número de vendas. Clique para
          ver detalhes.
        </Text>
      </Stack>

      <Stack gap={3}>
        <MonthlyTopStrip
          colorPalette={colorPalette}
          data={byMonth.data}
          isError={byMonth.isError}
          isLoading={byMonth.isLoading}
          monthLabel={monthRange.label}
          onOpenDetails={openDetails}
        />

        <SimpleGrid
          columns={{ base: 1, lg: 2 }}
          gap={3}
        >
          <RankList
            colorPalette={colorPalette}
            data={bySpent.data}
            expandedId={expandedId}
            isError={bySpent.isError}
            isLoading={bySpent.isLoading}
            onExpand={setExpandedId}
            onOpenDetails={openDetails}
            sortBy="totalSpent"
            subtitle="Ordenado pelo valor total gasto"
            title="Quem mais gasta"
          />
          <RankList
            colorPalette={colorPalette}
            data={byOrders.data}
            expandedId={expandedId}
            isError={byOrders.isError}
            isLoading={byOrders.isLoading}
            onExpand={setExpandedId}
            onOpenDetails={openDetails}
            sortBy="orderCount"
            subtitle="Ordenado pelo número de vendas"
            title="Quem mais compra"
          />
        </SimpleGrid>
      </Stack>

      <CustomerDetailsModal
        data={selected}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
      />
    </Box>
  )
}

const DashboardTopCustomersRank = memo(
  DashboardTopCustomersRankBase
) as typeof DashboardTopCustomersRankBase

export { DashboardTopCustomersRank }
