import {
  Badge,
  Box,
  Card,
  Flex,
  Icon,
  Image,
  Separator,
  Table,
  Text,
} from '@chakra-ui/react'
import {
  RiCoupon2Line,
  RiReceiptLine,
  RiRepeatLine,
  RiShoppingBag3Line,
} from 'react-icons/ri'
import { MdFastfood } from 'react-icons/md'

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

const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmado', color: 'green' },
  delivered: { label: 'Entregue', color: 'green' },
  cancelled: { label: 'Cancelado', color: 'red' },
  placed: { label: 'Recebido', color: 'blue' },
  in_preparation: { label: 'Preparando', color: 'orange' },
  ready_to_pickup: { label: 'Pronto', color: 'cyan' },
  dispatched: { label: 'Em entrega', color: 'purple' },
  concluded: { label: 'Concluído', color: 'green' },
}

type MetricCardProps = {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  accent?: boolean
}

function MetricCard({ icon, label, value, sub, accent }: MetricCardProps) {
  return (
    <Card.Root
      flex={1}
      overflow="hidden"
    >
      <Card.Body p={5}>
        <Flex
          alignItems="flex-start"
          justifyContent="space-between"
        >
          <Box>
            <Text
              color="fg.muted"
              fontSize="xs"
              fontWeight="semibold"
              letterSpacing="wide"
              mb={2}
              textTransform="uppercase"
            >
              {label}
            </Text>
            <Text
              color={accent ? 'yellow.600' : undefined}
              fontSize="2xl"
              fontWeight="bold"
              lineHeight="1"
              mb={sub ? 1.5 : 0}
            >
              {value}
            </Text>
            {sub && (
              <Text
                color="fg.muted"
                fontSize="xs"
              >
                {sub}
              </Text>
            )}
          </Box>
          <Box
            bg={accent ? 'yellow.100' : 'bg.muted'}
            borderRadius="lg"
            color={accent ? 'yellow.600' : 'fg.muted'}
            p={2.5}
            _dark={{ bg: accent ? 'yellow.900' : 'whiteAlpha.100' }}
          >
            <Icon
              as={icon}
              boxSize={5}
            />
          </Box>
        </Flex>
      </Card.Body>
    </Card.Root>
  )
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
      {/* Métricas */}
      <Text
        color="fg.muted"
        fontSize="xs"
        fontWeight="semibold"
        letterSpacing="wide"
        mb={3}
        textTransform="uppercase"
      >
        Resumo financeiro
      </Text>
      <Flex
        flexDirection={{ base: 'column', md: 'row' }}
        gap={3}
        mb={8}
      >
        <MetricCard
          accent
          icon={RiShoppingBag3Line}
          label="Gasto total (LTV)"
          sub={`${behavior.totalOrders} vendas no total`}
          value={formatCurrency(behavior.lifeTimeValue)}
        />
        <MetricCard
          icon={RiReceiptLine}
          label="Ticket médio"
          sub={`Calculado sobre ${behavior.totalOrders} vendas`}
          value={formatCurrency(behavior.averageTicket)}
        />
        <MetricCard
          icon={RiRepeatLine}
          label="Total de vendas"
          sub="Vendas registradas"
          value={String(behavior.totalOrders)}
        />
      </Flex>

      <Separator mb={6} />

      {/* Últimas Vendas */}
      <Flex
        alignItems="center"
        gap={2}
        mb={4}
      >
        <Box
          bg="yellow.100"
          borderRadius="md"
          color="yellow.600"
          p={1.5}
          _dark={{ bg: 'yellow.900' }}
        >
          <Icon
            as={MdFastfood}
            boxSize={4}
          />
        </Box>
        <Text
          fontSize="md"
          fontWeight="semibold"
        >
          Últimas 5 Vendas
        </Text>
      </Flex>

      <Card.Root overflow="hidden">
        <Card.Body p={0}>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Data</Table.ColumnHeader>
                <Table.ColumnHeader>Descrição</Table.ColumnHeader>
                <Table.ColumnHeader>Valor</Table.ColumnHeader>
                <Table.ColumnHeader>Cupom</Table.ColumnHeader>
                <Table.ColumnHeader>Origem</Table.ColumnHeader>
                <Table.ColumnHeader>Status</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {behavior.lastOrders && behavior.lastOrders.length > 0 ? (
                behavior.lastOrders.slice(0, 5).map((order) => {
                  const firstDiscount = order.discounts?.[0]
                  const couponName =
                    firstDiscount &&
                    ((firstDiscount.name as string) ||
                      (firstDiscount.code as string))
                      ? (firstDiscount.name as string) ||
                        (firstDiscount.code as string)
                      : null

                  const statusConfig =
                    ORDER_STATUS_MAP[order.status?.toLowerCase()] ?? null

                  return (
                    <Table.Row key={order.id}>
                      <Table.Cell whiteSpace="nowrap">
                        <Text
                          color="fg.muted"
                          fontSize="sm"
                        >
                          {formatDate(order.createdAt)}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text
                          fontSize="sm"
                          maxW="220px"
                          overflow="hidden"
                          textOverflow="ellipsis"
                          whiteSpace="nowrap"
                        >
                          {order.description}
                        </Text>
                      </Table.Cell>
                      <Table.Cell whiteSpace="nowrap">
                        <Text
                          fontWeight="semibold"
                        >
                          {formatCurrency(order.total)}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        {couponName ? (
                          <Badge
                            colorPalette="yellow"
                            gap={1}
                            variant="subtle"
                          >
                            <Icon
                              as={RiCoupon2Line}
                              boxSize={3}
                            />
                            {couponName}
                          </Badge>
                        ) : (
                          <Text
                            color="fg.subtle"
                            fontSize="sm"
                          >
                            —
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
                              alignItems="center"
                              bg="white"
                              borderRadius="md"
                              borderWidth="1px"
                              display="flex"
                              flexShrink={0}
                              h="28px"
                              justifyContent="center"
                              p={0.5}
                              w="28px"
                            >
                              <Image
                                alt={order.orderOrigin.name}
                                maxH="100%"
                                maxW="100%"
                                objectFit="contain"
                                src={order.orderOrigin.logoUrl}
                              />
                            </Box>
                          )}
                          <Text fontSize="sm">
                            {order.orderOrigin?.name ||
                              getOrderOrigin(
                                order.orderType,
                                order.salesChannel
                              )}
                          </Text>
                        </Flex>
                      </Table.Cell>
                      <Table.Cell>
                        {statusConfig ? (
                          <Badge
                            colorPalette={statusConfig.color}
                            size="sm"
                            variant="subtle"
                          >
                            {statusConfig.label}
                          </Badge>
                        ) : (
                          order.status && (
                            <Badge
                              colorPalette="gray"
                              size="sm"
                              variant="subtle"
                            >
                              {order.status}
                            </Badge>
                          )
                        )}
                      </Table.Cell>
                    </Table.Row>
                  )
                })
              ) : (
                <Table.Row>
                  <Table.Cell
                    colSpan={6}
                    textAlign="center"
                  >
                    <Flex
                      alignItems="center"
                      flexDirection="column"
                      gap={2}
                      py={8}
                    >
                      <Icon
                        as={MdFastfood}
                        boxSize={8}
                        color="fg.subtle"
                      />
                      <Text
                        color="fg.muted"
                        fontSize="sm"
                      >
                        Nenhuma venda encontrada
                      </Text>
                    </Flex>
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
