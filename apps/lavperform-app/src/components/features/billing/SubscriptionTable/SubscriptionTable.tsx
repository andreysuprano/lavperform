import { Badge, Table, Text } from '@chakra-ui/react'
import { memo } from 'react'

import { CustomTable } from '@/components'

import type { InvoiceItem } from '../InvoiceDetailsDrawer/InvoiceDetailsDrawer.types'
import type { Props } from './SubscriptionTable.types'

const statusMap: Record<string, string> = {
  ACTIVE: 'ATIVO',
  PENDING: 'PENDENTE',
  OVERDUE: 'ATRASADO',
  CANCELADO: 'CANCELADO',
  RECEIVED: 'PAGO',
  INACTIVE: 'INATIVO',
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  try {
    const [year, month, day] = dateString.split('-')
    return `${day}/${month}/${year}`
  } catch {
    return 'Data inválida'
  }
}

const formatCurrency = (value: number | string | undefined) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (numValue === undefined || isNaN(numValue)) {
    return 'R$ 0,00'
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(numValue)
}

function SubscriptionTableComponent({
  data,
  companyName,
  isLoading,
  onItemClick,
  onLimitChange,
  onPageChange,
}: Props) {
  return (
    <CustomTable<InvoiceItem>
      data={data}
      emptyStateMessage="Nenhuma assinatura encontrada"
      handleLimitChange={onLimitChange}
      handlePageChange={onPageChange}
      header={
        <>
          <Table.ColumnHeader>Nome</Table.ColumnHeader>
          <Table.ColumnHeader>Planos e módulos</Table.ColumnHeader>
          <Table.ColumnHeader>Valor</Table.ColumnHeader>
          <Table.ColumnHeader>Próx. Vencimento</Table.ColumnHeader>
          <Table.ColumnHeader>Status</Table.ColumnHeader>
        </>
      }
      isLoading={isLoading}
    >
      {data.map((item) => (
        <Table.Row
          cursor="pointer"
          key={item.id}
          onClick={() => onItemClick(item)}
        >
          <Table.Cell minW={200}>
            <Text lineClamp={1}>{companyName}</Text>
          </Table.Cell>
          <Table.Cell minW={200}>
            <Text lineClamp={1}>{item.planName}</Text>
          </Table.Cell>
          <Table.Cell minW={100}>
            <Text lineClamp={1}>{formatCurrency(item.planPrice)}</Text>
          </Table.Cell>
          <Table.Cell>
            <Badge colorPalette="gray">{formatDate(item.nextDueDate)}</Badge>
          </Table.Cell>
          <Table.Cell>
            <Badge colorPalette={item.status === 'ACTIVE' ? 'green' : 'red'}>
              {statusMap[item.status] || item.status}
            </Badge>
          </Table.Cell>
        </Table.Row>
      ))}
    </CustomTable>
  )
}

const SubscriptionTable = memo(
  SubscriptionTableComponent
) as typeof SubscriptionTableComponent

export { SubscriptionTable, type Props as SubscriptionTableProps }
