import {
  Card,
  Flex,
  Skeleton,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { memo, useEffect, useState } from 'react'

import { Empty } from '@/components/common'
import { useAuth } from '@/context/AuthContext'
import { useTodaySales } from '@/hooks/queries'
import { formatTimeOfDay } from '@/utils/date'
import { formatCurrency } from '@/utils/money'
import { formatSaleContact } from '@/utils/orders/formatSaleContact'
import { TODAY_SALES_PAGE_LIMIT } from '@/utils/orders/todaySales.constants'

import { RecentSalesPagination } from '../DashboardPerformanceSection/RecentSalesPagination'

function TodaySalesSkeleton() {
  return (
    <Stack gap={2}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton
          borderRadius="md"
          height="40px"
          key={index}
        />
      ))}
    </Stack>
  )
}

function SaleContactCell({
  phone,
  email,
}: {
  phone: string | null
  email: string | null
}) {
  const { phoneLabel, emailLabel } = formatSaleContact(phone, email)

  if (!phoneLabel && !emailLabel) {
    return <Text fontSize="sm">—</Text>
  }

  return (
    <Stack gap={0}>
      {phoneLabel ? <Text fontSize="sm">{phoneLabel}</Text> : null}
      {emailLabel ? <Text fontSize="sm">{emailLabel}</Text> : null}
    </Stack>
  )
}

function DashboardTodaySalesBase() {
  const { selectedCompany } = useAuth()
  const showTodayPurchases = selectedCompany?.showTodayPurchases === true
  const companyId = selectedCompany?.id
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [companyId])

  const { data, isError, isLoading } = useTodaySales(
    companyId,
    { page },
    { enabled: showTodayPurchases },
  )

  if (!showTodayPurchases) {
    return null
  }

  const sales = data?.sales ?? []
  const meta = data?.meta
  const hasItems = sales.length > 0

  return (
    <Card.Root>
      <Card.Header>
        <Flex
          align={{ base: 'flex-start', md: 'center' }}
          direction={{ base: 'column', md: 'row' }}
          gap={{ base: 2, md: 3 }}
          justify="space-between"
          w="full"
        >
          <Card.Title>Compras do dia</Card.Title>
          {!isLoading && !isError && (
            <RecentSalesPagination
              meta={meta}
              onPageChange={setPage}
              pageSize={TODAY_SALES_PAGE_LIMIT}
            />
          )}
        </Flex>
      </Card.Header>
      <Card.Body>
        {isLoading ? (
          <TodaySalesSkeleton />
        ) : isError ? (
          <Empty
            description="Não foi possível carregar as compras do dia."
            title="Erro ao carregar vendas"
          />
        ) : hasItems ? (
          <Table.ScrollArea>
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Nome</Table.ColumnHeader>
                  <Table.ColumnHeader>Contato</Table.ColumnHeader>
                  <Table.ColumnHeader>Serviço contratado</Table.ColumnHeader>
                  <Table.ColumnHeader>Horário</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">Valor</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {sales.map((sale) => (
                  <Table.Row key={sale.id}>
                    <Table.Cell>
                      <Text fontSize="sm">{sale.customerName}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <SaleContactCell
                        email={sale.customerEmail}
                        phone={sale.customerPhone}
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">{sale.productsLabel}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">{formatTimeOfDay(sale.saleDate)}</Text>
                    </Table.Cell>
                    <Table.Cell textAlign="end">
                      <Text fontSize="sm">{formatCurrency(sale.saleAmount)}</Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        ) : (
          <Empty title="Nenhuma compra hoje" />
        )}
      </Card.Body>
    </Card.Root>
  )
}

const DashboardTodaySales = memo(
  DashboardTodaySalesBase
) as typeof DashboardTodaySalesBase

export { DashboardTodaySales }
export type { Props as DashboardTodaySalesProps } from './DashboardTodaySales.types'
