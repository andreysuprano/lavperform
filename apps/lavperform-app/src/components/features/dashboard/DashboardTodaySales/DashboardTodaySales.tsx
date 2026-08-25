import {
  Card,
  Flex,
  IconButton,
  Skeleton,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { memo, useEffect, useState } from 'react'
import { LuEye, LuEyeOff } from 'react-icons/lu'

import { Empty } from '@/components/common'
import { toaster } from '@/components/ui/toaster'
import { useAuth } from '@/context/AuthContext'
import { useTodaySales } from '@/hooks/queries'
import { companyService } from '@/services'
import { buildCompanyUpdatePayload } from '@/utils/companies/buildCompanyUpdatePayload'
import { formatTimeOfDay } from '@/utils/date'
import { logger } from '@/utils/logger'
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
  const { selectedCompany, updateCompanyFlags } = useAuth()
  const isListVisible = selectedCompany?.showTodayPurchases === true
  const companyId = selectedCompany?.id
  const [page, setPage] = useState(1)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [companyId])

  const { data, isError, isLoading } = useTodaySales(
    companyId,
    { page },
    { enabled: isListVisible },
  )

  const handleToggleList = async () => {
    if (!companyId || isSaving) return

    const nextVisible = !isListVisible
    updateCompanyFlags(companyId, { showTodayPurchases: nextVisible })
    setIsSaving(true)

    try {
      const response = await companyService.getCompany(companyId)
      await companyService.updateCompany(
        companyId,
        buildCompanyUpdatePayload(response.data, nextVisible)
      )
    } catch (error) {
      logger.error('Erro ao salvar visibilidade das compras do dia:', error)
      updateCompanyFlags(companyId, { showTodayPurchases: isListVisible })
      toaster.create({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar a visibilidade da lista.',
        type: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const sales = data?.sales ?? []
  const meta = data?.meta
  const hasItems = sales.length > 0

  return (
    <Card.Root>
      <Card.Header
        alignItems="center"
        minH="unset"
        py={isListVisible ? undefined : 4}
      >
        <Flex
          align="center"
          gap={3}
          justify="space-between"
          w="full"
        >
          <Flex
            align="center"
            gap={2}
            minW={0}
          >
            <Card.Title>Compras do dia</Card.Title>
            <IconButton
              aria-label={
                isListVisible
                  ? 'Ocultar lista de compras do dia'
                  : 'Mostrar lista de compras do dia'
              }
              disabled={isSaving || !companyId}
              onClick={() => void handleToggleList()}
              size="sm"
              variant="ghost"
            >
              {isListVisible ? <LuEyeOff /> : <LuEye />}
            </IconButton>
          </Flex>
          {isListVisible && !isLoading && !isError ? (
            <RecentSalesPagination
              meta={meta}
              onPageChange={setPage}
              pageSize={TODAY_SALES_PAGE_LIMIT}
            />
          ) : null}
        </Flex>
      </Card.Header>
      {isListVisible ? (
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
      ) : null}
    </Card.Root>
  )
}

const DashboardTodaySales = memo(
  DashboardTodaySalesBase
) as typeof DashboardTodaySalesBase

export { DashboardTodaySales }
export type { Props as DashboardTodaySalesProps } from './DashboardTodaySales.types'
