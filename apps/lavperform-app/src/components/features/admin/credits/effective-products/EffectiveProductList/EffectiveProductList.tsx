import {
  Badge,
  Box,
  createListCollection,
  Flex,
  Input,
  Select,
  Table,
  Text,
} from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'

import { CustomTable } from '@/components'
import { useEffectiveProducts } from '@/hooks/queries'
import type { EffectiveProduct } from '@/types'
import { tableStickyStyles } from '@/utils/tableStickyStyles'

import { formatCreditCents } from '../../utils'

interface Props {
  companyId: string
  hideCode?: boolean
}

const activeFilterCollection = createListCollection({
  items: [
    { label: 'Todos', value: 'all' },
    { label: 'Ativos', value: 'active' },
    { label: 'Inativos', value: 'inactive' },
  ],
})

function SourceBadge({ source }: { source: EffectiveProduct['source'] }) {
  return (
    <Badge colorPalette={source === 'CUSTOM' ? 'blue' : 'gray'}>
      {source === 'CUSTOM' ? 'Personalizado' : 'Default'}
    </Badge>
  )
}

export function EffectiveProductList({ companyId, hideCode = false }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [params, setParams] = useState({ page: 1, limit: 20 })

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)

    return () => clearTimeout(timeout)
  }, [searchQuery])

  useEffect(() => {
    setParams((prev) => ({ ...prev, page: 1 }))
  }, [debouncedSearchQuery, activeFilter])

  const queryParams = useMemo(
    () => ({
      ...params,
      ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
      ...(activeFilter !== 'all' && { active: activeFilter === 'active' }),
    }),
    [activeFilter, debouncedSearchQuery, params]
  )

  const { data, isLoading } = useEffectiveProducts(companyId, queryParams)
  const products = data?.items ?? []

  return (
    <>
      <Flex
        alignItems="center"
        direction={{ base: 'column', lg: 'row' }}
        gap={2}
        mb={4}
      >
        <Input
          bg="bg"
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar por nome, código ou descrição..."
          value={searchQuery}
        />
        <Box minW={{ base: 'full', lg: '180px' }}>
          <Select.Root
            collection={activeFilterCollection}
            onValueChange={({ value }) => setActiveFilter(value[0] ?? 'all')}
            value={[activeFilter]}
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
                {activeFilterCollection.items.map((item) => (
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
      </Flex>
      <CustomTable<EffectiveProduct>
        css={tableStickyStyles}
        data={products}
        emptyStateMessage="Nenhum produto efetivo encontrado"
        handleLimitChange={(limit) => setParams({ page: 1, limit })}
        handlePageChange={(page) => setParams((prev) => ({ ...prev, page }))}
        header={
          <>
            <Table.ColumnHeader>Status</Table.ColumnHeader>
            <Table.ColumnHeader>Origem</Table.ColumnHeader>
            <Table.ColumnHeader>Nome</Table.ColumnHeader>
            {!hideCode && <Table.ColumnHeader>Código</Table.ColumnHeader>}
            <Table.ColumnHeader>Descrição</Table.ColumnHeader>
            <Table.ColumnHeader>Valor</Table.ColumnHeader>
          </>
        }
        isLoading={isLoading}
        meta={data?.meta}
      >
        {products.map((product) => (
          <Table.Row key={product.id}>
            <Table.Cell>
              <Badge colorPalette={product.active ? 'green' : 'gray'}>
                {product.active ? 'Ativo' : 'Inativo'}
              </Badge>
            </Table.Cell>
            <Table.Cell minW={140}>
              <SourceBadge source={product.source} />
            </Table.Cell>
            <Table.Cell minW={200}>
              <Text lineClamp={1}>{product.name}</Text>
            </Table.Cell>
            {!hideCode && (
              <Table.Cell minW={180}>
                <Text
                  fontFamily="mono"
                  lineClamp={1}
                >
                  {product.code}
                </Text>
              </Table.Cell>
            )}
            <Table.Cell minW={240}>
              <Text lineClamp={1}>{product.description || '-'}</Text>
            </Table.Cell>
            <Table.Cell minW={120}>
              {formatCreditCents(product.priceCents)}
            </Table.Cell>
          </Table.Row>
        ))}
      </CustomTable>
    </>
  )
}
