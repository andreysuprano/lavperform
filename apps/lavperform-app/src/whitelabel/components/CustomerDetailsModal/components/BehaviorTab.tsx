import {
  Badge,
  Box,
  Card,
  Flex,
  Image,
  Table,
  Text,
} from '@chakra-ui/react'
import {
  RiReceiptLine,
  RiRecycleLine,
  RiShoppingBagLine,
} from 'react-icons/ri'

import type { Customer } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { useCustomerDetails } from '@/hooks/useCustomerDetails'
import { LoadingState } from '@/components'
import { formatCurrency } from '@/utils/money'
import { formatDate } from '@/utils/strings'
import { getOrderOrigin } from '@/utils/orderMapping'

type Props = {
  customer: Customer
}

export function BehaviorTab({ customer }: Props) {
  const { selectedCompany } = useAuth()
  const { behavior, loading } = useCustomerDetails(
    selectedCompany?.id,
    customer.id
  )

  if (loading) {
    return <LoadingState />
  }

  if (!behavior) {
    return null
  }

  return (
    <Box>
      {/* Resumo Financeiro */}
      <Text
        fontSize="lg"
        fontWeight="bold"
        mb={4}
      >
        Resumo Financeiro
      </Text>
      <Flex
        gap={4}
        mb={8}
        flexDirection={{ base: 'column', md: 'row' }}
      >
        {/* Card 1 - Gasto Total (LTV) */}
        <Card.Root
          flex={1}
        >
          <Card.Body position="relative">
            <Box
              color="yellow.400"
              fontSize="4xl"
              position="absolute"
              right={4}
              top={4}
            >
              <RiShoppingBagLine />
            </Box>
            <Text
              color="fg.muted"
              fontSize="sm"
              fontWeight="medium"
              mb={2}
            >
              Gasto Total (LTV)
            </Text>
            <Text
              fontSize="2xl"
              fontWeight="bold"
            >
              {formatCurrency(behavior.lifeTimeValue)}
            </Text>
            <Text
              color="fg.muted"
              fontSize="sm"
              mt={2}
            >
              Baseado em {behavior.totalOrders} ciclos
            </Text>
          </Card.Body>
        </Card.Root>

        {/* Card 2 - Ticket Médio */}
        <Card.Root
          flex={1}
        >
          <Card.Body position="relative">
            <Box
              color="yellow.500"
              fontSize="4xl"
              position="absolute"
              right={4}
              top={4}
            >
              <RiReceiptLine />
            </Box>
            <Text
              color="fg.muted"
              fontSize="sm"
              fontWeight="medium"
              mb={2}
            >
              Ticket Médio
            </Text>
            <Text
              fontSize="2xl"
              fontWeight="bold"
              mb={2}
            >
              {formatCurrency(behavior.averageTicket)}
            </Text>
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              Baseado em {behavior.totalOrders} ciclos
            </Text>
          </Card.Body>
        </Card.Root>

        {/* Card 3 - Total de Pedidos */}
        <Card.Root
          flex={1}
        >
          <Card.Body position="relative">
            <Box
              color="yellow.500"
              fontSize="4xl"
              position="absolute"
              right={4}
              top={4}
            >
              <RiRecycleLine />
            </Box>
            <Text
              color="fg.muted"
              fontSize="sm"
              fontWeight="medium"
              mb={2}
            >
              Total de Ciclos
            </Text>
            <Text
              fontSize="2xl"
              fontWeight="bold"
            >
              {behavior.totalOrders}
            </Text>
          </Card.Body>
        </Card.Root>
      </Flex>

      {/* Últimos Pedidos */}
      <Flex
        alignItems="center"
        gap={2}
        mb={4}
      >
        < RiRecycleLine/>
        <Text
          fontSize="lg"
          fontWeight="bold"
        >
          Últimos Ciclos
        </Text>
      </Flex>
      <Card.Root>
        <Card.Body p={0}>
          <Table.Root>
          <Table.Header>
              <Table.Row>
              <Table.ColumnHeader>DATA</Table.ColumnHeader>
              <Table.ColumnHeader>Descrição</Table.ColumnHeader>
              <Table.ColumnHeader>VALOR</Table.ColumnHeader>
              <Table.ColumnHeader>CUPOM</Table.ColumnHeader>
              <Table.ColumnHeader>ORIGEM</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {behavior.lastOrders && behavior.lastOrders.length > 0 ? (
              behavior.lastOrders.map((order) => {
                // Extrai nome do cupom do primeiro desconto, se existir
                const firstDiscount = order.discounts?.[0]
                const couponName =
                  firstDiscount && (firstDiscount.name || firstDiscount.code)
                    ? (firstDiscount.name as string) ||
                      (firstDiscount.code as string)
                    : ' '

                return (
                  <Table.Row key={order.id}>
                    <Table.Cell>
                      <Text>{formatDate(order.createdAt)}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text>{order.description}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontWeight="medium">
                        {formatCurrency(order.total)}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      {couponName !== ' ' ? (
                        <Badge
                          colorPalette="black"
                          variant="solid"
                        >
                          {couponName}
                        </Badge>
                      ) : (
                        <Text
                          color="gray.500"
                          fontSize="sm"
                        >
                           
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Flex
                        alignItems="center"
                        gap={2}
                      >
                        {order.orderOrigin?.logoUrl && (
                          <Box
                            bg="white"
                            borderRadius="md"
                            borderWidth="1px"
                            p={1}
                            w="32px"
                            h="32px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Image
                              alt={order.orderOrigin.name}
                              src={order.orderOrigin.logoUrl}
                              maxW="100%"
                              maxH="100%"
                              objectFit="contain"
                            />
                          </Box>
                        )}
                        <Text>
                          {order.orderOrigin?.name ||
                            getOrderOrigin(order.orderType, order.salesChannel)}
                        </Text>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                )
              })
            ) : (
              <Table.Row>
                <Table.Cell
                  colSpan={5}
                  textAlign="center"
                >
                  <Text
                    color="gray.500"
                    py={4}
                  >
                    Nenhum pedido encontrado
                  </Text>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
        </Card.Body>
      </Card.Root>
    </Box>
  )
}
