import {
  Badge,
  Box,
  Code,
  createListCollection,
  Flex,
  Input,
  Select,
  Table,
  Text,
} from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'

import { CustomTable } from '@/components'
import { useCreditLedger, useCreditProducts } from '@/hooks/queries'
import type { CreditLedgerEntry, CreditLedgerType } from '@/types'
import { tableStickyStyles } from '@/utils/tableStickyStyles'

import { formatCreditCents, formatDateTime } from '../../utils'

interface Props {
  companyId: string
  compact?: boolean
}

interface GroupedEntry {
  key: string
  day: string
  type: CreditLedgerType
  count: number
  totalAmountCents: number
  lastBalanceAfterCents: number
}

const typeFilterCollection = createListCollection({
  items: [
    { label: 'Todos', value: 'all' },
    { label: 'Recarga', value: 'TOPUP' },
    { label: 'Consumo', value: 'CONSUMPTION' },
  ],
})

function LedgerTypeBadge({ type }: { type: CreditLedgerType }) {
  return (
    <Badge colorPalette={type === 'TOPUP' ? 'green' : 'red'}>
      {type === 'TOPUP' ? 'Recarga' : 'Consumo'}
    </Badge>
  )
}

function MetadataPreview({
  metadata,
}: {
  metadata?: CreditLedgerEntry['metadata']
}) {
  if (!metadata || Object.keys(metadata).length === 0) return <Text>-</Text>

  return (
    <Code
      display="block"
      maxW="320px"
      overflow="hidden"
      p={2}
      whiteSpace="nowrap"
    >
      {JSON.stringify(metadata)}
    </Code>
  )
}

export function LedgerList({ companyId, compact = false }: Props) {
  const [type, setType] = useState('all')
  const [productId, setProductId] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [params, setParams] = useState({ page: 1, limit: compact ? 100 : 20 })

  const { data: productsData } = useCreditProducts(
    compact ? undefined : companyId,
    { page: 1, limit: 100, active: true }
  )

  const productCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: 'Todos os produtos', value: 'all' },
          ...(productsData?.items ?? []).map((product) => ({
            label: product.name,
            value: product.id,
          })),
        ],
      }),
    [productsData?.items]
  )

  useEffect(() => {
    setParams((prev) => ({ ...prev, page: 1 }))
  }, [type, productId, startDate, endDate])

  const queryParams = useMemo(
    () => ({
      ...params,
      ...(type !== 'all' && { type: type as CreditLedgerType }),
      ...(productId !== 'all' && { productId }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    }),
    [endDate, params, productId, startDate, type]
  )

  const { data, isLoading } = useCreditLedger(companyId, queryParams)
  const entries = data?.items ?? []

  const groupedEntries = useMemo<GroupedEntry[]>(() => {
    if (!compact) return []
    const map = new Map<string, GroupedEntry>()
    for (const entry of entries) {
      const day = entry.createdAt.slice(0, 10)
      const key = `${day}__${entry.type}`
      const existing = map.get(key)
      if (existing) {
        existing.count++
        existing.totalAmountCents += entry.amountCents
      } else {
        map.set(key, {
          key,
          day,
          type: entry.type,
          count: 1,
          totalAmountCents: entry.amountCents,
          lastBalanceAfterCents: entry.balanceAfterCents,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.day.localeCompare(a.day))
  }, [compact, entries])

  const formatDay = (day: string) =>
    new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(
      new Date(`${day}T12:00:00`)
    )

  if (compact) {
    return (
      <>
        <Flex
          alignItems="center"
          direction={{ base: 'column', xl: 'row' }}
          gap={2}
          mb={4}
        >
          <Box minW={{ base: 'full', xl: '180px' }}>
            <Select.Root
              collection={typeFilterCollection}
              onValueChange={({ value }) => setType(value[0] ?? 'all')}
              value={[type]}
            >
              <Select.HiddenSelect />
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Select.Positioner>
                <Select.Content>
                  {typeFilterCollection.items.map((item) => (
                    <Select.Item
                      item={item}
                      key={item.value}
                    >
                      {item.label}
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
          </Box>
          <Input
            bg="bg"
            onChange={(event) => setStartDate(event.target.value)}
            type="date"
            value={startDate}
          />
          <Input
            bg="bg"
            onChange={(event) => setEndDate(event.target.value)}
            type="date"
            value={endDate}
          />
        </Flex>
        <CustomTable<GroupedEntry>
          css={tableStickyStyles}
          data={groupedEntries}
          emptyStateMessage="Nenhum lançamento encontrado"
          handleLimitChange={(limit) => setParams({ page: 1, limit })}
          handlePageChange={(page) => setParams((prev) => ({ ...prev, page }))}
          header={
            <>
              <Table.ColumnHeader>Data</Table.ColumnHeader>
              <Table.ColumnHeader>Tipo</Table.ColumnHeader>
              <Table.ColumnHeader>Transações</Table.ColumnHeader>
              <Table.ColumnHeader>Total</Table.ColumnHeader>
              <Table.ColumnHeader>Saldo após</Table.ColumnHeader>
            </>
          }
          isLoading={isLoading}
          meta={data?.meta}
        >
          {groupedEntries.map((group) => (
            <Table.Row key={group.key}>
              <Table.Cell minW={120}>{formatDay(group.day)}</Table.Cell>
              <Table.Cell>
                <LedgerTypeBadge type={group.type} />
              </Table.Cell>
              <Table.Cell minW={120}>
                <Text color="fg.muted">{group.count} lançamento{group.count !== 1 ? 's' : ''}</Text>
              </Table.Cell>
              <Table.Cell
                color={group.totalAmountCents >= 0 ? 'green.600' : 'red.600'}
                fontWeight="semibold"
                minW={130}
              >
                {formatCreditCents(group.totalAmountCents)}
              </Table.Cell>
              <Table.Cell minW={140}>
                {formatCreditCents(group.lastBalanceAfterCents)}
              </Table.Cell>
            </Table.Row>
          ))}
        </CustomTable>
      </>
    )
  }

  return (
    <>
      <Flex
        alignItems="center"
        direction={{ base: 'column', xl: 'row' }}
        gap={2}
        mb={4}
      >
        <Box minW={{ base: 'full', xl: '180px' }}>
          <Select.Root
            collection={typeFilterCollection}
            onValueChange={({ value }) => setType(value[0] ?? 'all')}
            value={[type]}
          >
            <Select.HiddenSelect />
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText />
              </Select.Trigger>
              <Select.IndicatorGroup>
                <Select.Indicator />
              </Select.IndicatorGroup>
            </Select.Control>
            <Select.Positioner>
              <Select.Content>
                {typeFilterCollection.items.map((item) => (
                  <Select.Item
                    item={item}
                    key={item.value}
                  >
                    {item.label}
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Select.Root>
        </Box>
        <Box minW={{ base: 'full', xl: '220px' }}>
          <Select.Root
            collection={productCollection}
            onValueChange={({ value }) => setProductId(value[0] ?? 'all')}
            value={[productId]}
          >
            <Select.HiddenSelect />
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText />
              </Select.Trigger>
              <Select.IndicatorGroup>
                <Select.Indicator />
              </Select.IndicatorGroup>
            </Select.Control>
            <Select.Positioner>
              <Select.Content>
                {productCollection.items.map((item) => (
                  <Select.Item
                    item={item}
                    key={item.value}
                  >
                    {item.label}
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Select.Root>
        </Box>
        <Input
          bg="bg"
          onChange={(event) => setStartDate(event.target.value)}
          type="date"
          value={startDate}
        />
        <Input
          bg="bg"
          onChange={(event) => setEndDate(event.target.value)}
          type="date"
          value={endDate}
        />
      </Flex>
      <CustomTable<CreditLedgerEntry>
        css={tableStickyStyles}
        data={entries}
        emptyStateMessage="Nenhum lançamento encontrado"
        handleLimitChange={(limit) => setParams({ page: 1, limit })}
        handlePageChange={(page) => setParams((prev) => ({ ...prev, page }))}
        header={
          <>
            <Table.ColumnHeader>Tipo</Table.ColumnHeader>
            <Table.ColumnHeader>Valor</Table.ColumnHeader>
            <Table.ColumnHeader>Saldo após</Table.ColumnHeader>
            <Table.ColumnHeader>Produto</Table.ColumnHeader>
            <Table.ColumnHeader>Recarga</Table.ColumnHeader>
            <Table.ColumnHeader>Metadata</Table.ColumnHeader>
            <Table.ColumnHeader>Criado em</Table.ColumnHeader>
          </>
        }
        isLoading={isLoading}
        meta={data?.meta}
      >
        {entries.map((entry) => (
          <Table.Row key={entry.id}>
            <Table.Cell>
              <LedgerTypeBadge type={entry.type} />
            </Table.Cell>
            <Table.Cell
              color={entry.amountCents >= 0 ? 'green.600' : 'red.600'}
              fontWeight="semibold"
              minW={120}
            >
              {formatCreditCents(entry.amountCents)}
            </Table.Cell>
            <Table.Cell minW={140}>
              {formatCreditCents(entry.balanceAfterCents)}
            </Table.Cell>
            <Table.Cell minW={180}>
              <Text lineClamp={1}>
                {entry.product?.name ?? entry.productId ?? '-'}
              </Text>
            </Table.Cell>
            <Table.Cell minW={180}>
              <Text
                fontFamily="mono"
                lineClamp={1}
              >
                {entry.topupId ?? '-'}
              </Text>
            </Table.Cell>
            <Table.Cell minW={260}>
              <MetadataPreview metadata={entry.metadata} />
            </Table.Cell>
            <Table.Cell minW={160}>{formatDateTime(entry.createdAt)}</Table.Cell>
          </Table.Row>
        ))}
      </CustomTable>
    </>
  )
}
