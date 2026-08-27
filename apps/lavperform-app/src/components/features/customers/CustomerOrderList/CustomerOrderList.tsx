import { Box, Card, Heading } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useState } from 'react'

import { Empty, LoadingState } from '@/components'
import { getBusinessCopy } from '@/config'
import { customerService } from '@/services'
import type { CustomerOrder } from '@/types'
import { convertISOToDate } from '@/utils/convertISOToDate'
import { logger } from '@/utils/logger'
import { formatCurrency } from '@/utils/money'

import type { Props } from './CustomerOrderList.types'

const CustomerOrderListComponent = ({ customerId }: Props) => {
  const [isLoading, setIsLoading] = useState(false)

  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])

  const fetchCustomers = useCallback(async () => {
    if (!customerId) return

    setIsLoading(true)

    try {
      const response = await customerService.listCustomerOrders(customerId)

      setCustomerOrders(response.data.orders)
    } catch (error) {
      logger.error('Erro ao buscar clientes:', error)

      alert(
        'Erro ao carregar clientes. Verifique o console para mais detalhes.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  if (customerOrders.length === 0) {
    return (
      <Empty
        description="Não localizamos nenhuma venda gerada por esse cliente."
        title="Nenhuma venda encontrada"
      />
    )
  }

  if (isLoading) {
    return <LoadingState />
  }

  return (
    <>
      {customerOrders.map((order, index) => (
        <Card.Root
          key={index}
          mb={4}
        >
          <Card.Header gap={2}>
            <p>
              {getBusinessCopy().deliveryFeeLabel}:{' '}
              <strong>{formatCurrency(Number(order.deliveryFee))}</strong>
            </p>
            <p>
              Total da venda:{' '}
              <strong>{formatCurrency(Number(order.total))}</strong>
            </p>
            <p>
              Forma de pagamentos:{' '}
              <strong>
                {order.payments
                  .map(
                    (item) =>
                      paymentType[
                        item.paymentMethod as keyof typeof paymentType
                      ]
                  )
                  .join(', ')}
              </strong>
            </p>
            <p>
              Data da venda:{' '}
              <strong>
                {convertISOToDate(order.createdAt, {
                  timeZone: 'UTC',
                  hour: 'numeric',
                  minute: 'numeric',
                })}
              </strong>
            </p>
          </Card.Header>
          <Card.Body gap={2}>
            <p>Itens da venda:</p>
            {order.items.map((item, index) => (
              <Card.Root
                key={index}
                size="sm"
              >
                <Card.Body background={'gray.50'}>
                  <Heading size="xl">{item.name}</Heading>
                  <Box
                    as="ol"
                    listStyle={'revert'}
                    ml={4}
                  >
                    {item.options.map((option, index) => (
                      <li key={index}>{option.name}</li>
                    ))}
                  </Box>
                </Card.Body>
                <Card.Body>
                  <p>
                    Valor unitário:{' '}
                    <strong>{formatCurrency(Number(item.unitPrice))}</strong>
                  </p>
                  <p>
                    Valor total:{' '}
                    <strong>{formatCurrency(Number(item.totalPrice))}</strong>
                  </p>
                  <p>
                    Quantidade de itens: <strong>{item.quantity}</strong>
                  </p>
                </Card.Body>
              </Card.Root>
            ))}
          </Card.Body>
        </Card.Root>
      ))}
    </>
  )
}

const CustomerOrderList = memo(CustomerOrderListComponent)

export { CustomerOrderList, type Props as CustomerOrderListProps }

const paymentType = {
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  pix: 'Pix',
  money: 'Dinheiro',
}
