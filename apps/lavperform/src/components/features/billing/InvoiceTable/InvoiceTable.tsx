import { Badge, Table, Text } from '@chakra-ui/react'
import { memo } from 'react'

import { CustomTable } from '@/components'

import { InvoiceItem } from '../InvoiceDetailsDrawer/InvoiceDetailsDrawer.types'
import { Props } from './InvoiceTable.types'

const statusMap: Record<string, string> = {
  ACTIVE: 'ATIVO',
  PENDING: 'PENDENTE',
  CONFIRMED: 'CONFIRMADO',
  OVERDUE: 'ATRASADO',
  CANCELADO: 'CANCELADO',
  RECEIVED: 'PAGO',
  INACTIVE: 'INATIVO',
  WAITING_FOR_CONFIRMATION: 'AGUARDANDO',
  RECEIVED_IN_CASH: 'PAGO (PIX/BOLETO)',
}

const statusColorMap: Record<string, string> = {
  ACTIVE: 'green',
  CONFIRMED: 'red',
  PENDING: 'yellow',
  OVERDUE: 'orange',
  RECEIVED: 'green',
  CANCELADO: 'red',
  INACTIVE: 'gray',
  WAITING_FOR_CONFIRMATION: 'yellow',
  RECEIVED_IN_CASH: 'green',
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

function InvoiceTableComponent({
  data,
  isLoading,
  onItemClick,
  onLimitChange,
  onPageChange,
}: Props) {
  return (
    <CustomTable<InvoiceItem>
      data={data}
      emptyStateMessage="Nenhuma fatura encontrada"
      handleLimitChange={onLimitChange}
      handlePageChange={onPageChange}
      header={
        <>
          <Table.ColumnHeader>Número</Table.ColumnHeader>
          <Table.ColumnHeader>Vencimento</Table.ColumnHeader>
          <Table.ColumnHeader>Valor</Table.ColumnHeader>
          <Table.ColumnHeader>Forma de pagamento</Table.ColumnHeader>
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
            <Text lineClamp={1}>{item.invoiceNumber}</Text>
          </Table.Cell>
          <Table.Cell minW={200}>
            <Text lineClamp={1}>{formatDate(item.nextDueDate)}</Text>
          </Table.Cell>
          <Table.Cell minW={100}>
            <Text lineClamp={1}>{formatCurrency(item.planPrice)}</Text>
          </Table.Cell>
          <Table.Cell>
            <Badge colorPalette="purple">{item.card}</Badge>
          </Table.Cell>
          <Table.Cell>
            <Badge colorPalette={statusColorMap[item.status] || 'gray'}>
              {statusMap[item.status] || item.status}
            </Badge>
          </Table.Cell>
        </Table.Row>
      ))}
    </CustomTable>
  )
}

const InvoiceTable = memo(InvoiceTableComponent) as typeof InvoiceTableComponent

export { InvoiceTable, type Props as InvoiceTableProps }
