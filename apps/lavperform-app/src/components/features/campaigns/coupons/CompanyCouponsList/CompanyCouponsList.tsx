import { Badge, Flex, Input, Table, Text } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { RiCheckboxCircleLine, RiCloseCircleLine } from 'react-icons/ri'

import { CustomTable } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useCompanyCoupons } from '@/hooks/queries'
import type { CompanyCoupon } from '@/types'
import { formatFullDate } from '@/utils/date'

import { CreateCouponForm } from '../CreateCouponForm/CreateCouponForm'

const typeMap: Record<string, string> = {
  desconto: 'Desconto',
  frete: 'Frete',
}

const unitMap: Record<string, string> = {
  reais: 'R$',
  porcentagem: '%',
  km: 'km',
}

function formatValue(value: number, unit: string): string {
  if (unit === 'reais') {
    return `R$ ${value.toFixed(2).replace('.', ',')}`
  }
  if (unit === 'porcentagem') return `${value}%`
  if (unit === 'km') return `${value} km`
  return String(value)
}

function CompanyCouponsListBase() {
  const { selectedCompany } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [params, setParams] = useState({ page: 1, limit: 10 })
  const [editingCoupon, setEditingCoupon] = useState<CompanyCoupon | null>(null)

  const { data: couponsResult, isLoading } = useCompanyCoupons(
    selectedCompany?.id,
    params
  )

  const allCoupons = couponsResult?.data ?? []
  const meta = couponsResult?.meta

  const filteredCoupons = useMemo(() => {
    if (!searchQuery.trim()) return allCoupons
    const q = searchQuery.toLowerCase()
    return allCoupons.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q)
    )
  }, [allCoupons, searchQuery])

  useEffect(() => {
    setParams((prev) => ({ ...prev, page: 1 }))
  }, [searchQuery])

  const handleLimitChange = useCallback((limit: number) => {
    setParams((prev) => ({ ...prev, limit, page: 1 }))
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setParams((prev) => ({ ...prev, page }))
  }, [])

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value)
    },
    []
  )

  if (!selectedCompany) return null

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
          placeholder="Pesquisar cupom..."
          value={searchQuery}
        />
        <CreateCouponForm />
      </Flex>

      {editingCoupon && (
        <CreateCouponForm
          coupon={editingCoupon}
          onClose={() => setEditingCoupon(null)}
          onOpenChange={(open) => {
            if (!open) setEditingCoupon(null)
          }}
          open={!!editingCoupon}
        />
      )}

      <CustomTable<CompanyCoupon>
        data={filteredCoupons}
        emptyStateMessage="Nenhum cupom encontrado"
        handleLimitChange={handleLimitChange}
        handlePageChange={handlePageChange}
        header={
          <>
            <Table.ColumnHeader>Código</Table.ColumnHeader>
            <Table.ColumnHeader>Descrição</Table.ColumnHeader>
            <Table.ColumnHeader>Tipo</Table.ColumnHeader>
            <Table.ColumnHeader>Unidade</Table.ColumnHeader>
            <Table.ColumnHeader>Valor</Table.ColumnHeader>
            <Table.ColumnHeader>Válido até</Table.ColumnHeader>
            <Table.ColumnHeader>Status</Table.ColumnHeader>
          </>
        }
        isLoading={isLoading}
        meta={meta}
      >
        {filteredCoupons.map((item) => (
          <Table.Row
            cursor="pointer"
            key={item.id}
            onClick={() => setEditingCoupon(item)}
          >
            <Table.Cell minW={140}>
              <Text
                fontWeight="semibold"
                lineClamp={1}
              >
                {item.code}
              </Text>
            </Table.Cell>
            <Table.Cell minW={200}>
              <Text
                color="fg.muted"
                fontSize="sm"
                lineClamp={2}
              >
                {item.description || ' '}
              </Text>
            </Table.Cell>
            <Table.Cell>
              <Badge
                colorPalette="gray"
                variant="subtle"
              >
                {typeMap[item.type] ?? item.type}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              <Text>{unitMap[item.unit] ?? item.unit}</Text>
            </Table.Cell>
            <Table.Cell>
              <Text>{formatValue(item.value, item.unit)}</Text>
            </Table.Cell>
            <Table.Cell minW={120}>
              <Text>
                {item.validUntil ? formatFullDate(item.validUntil) : ' '}
              </Text>
            </Table.Cell>
            <Table.Cell>
              {item.active ? (
                <Badge
                  colorPalette="green"
                  variant="solid"
                >
                  <RiCheckboxCircleLine /> Ativo
                </Badge>
              ) : (
                <Badge
                  colorPalette="red"
                  variant="solid"
                >
                  <RiCloseCircleLine /> Inativo
                </Badge>
              )}
            </Table.Cell>
          </Table.Row>
        ))}
      </CustomTable>
    </>
  )
}

const CompanyCouponsList = memo(CompanyCouponsListBase)
CompanyCouponsList.displayName = 'CompanyCouponsList'

export { CompanyCouponsList }
