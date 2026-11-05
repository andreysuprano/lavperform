import { Badge, Box, Button, Text } from '@chakra-ui/react'
import { LuChevronRight, LuPhone } from 'react-icons/lu'

import { useColorModeValue } from '@/components/ui/color-mode'
import type { Customer } from '@/types'
import { getCustomerCategoryLabel } from '@/utils/customers/customerCategory'
import { formatTelefone } from '@/utils/mask'

function daysAgo(value?: string | null) {
  if (!value) return 'Sem pedidos'
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000)
  if (Number.isNaN(days) || days < 0) return 'Sem pedidos'
  if (days === 0) return 'Último pedido hoje'
  if (days === 1) return 'Último pedido há 1 dia'
  return `Último pedido há ${days} dias`
}

function money(value: string | number | null | undefined) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function CustomerPhoneList({
  customers,
  onSelect,
}: {
  customers: Customer[]
  onSelect: (customer: Customer) => void
}) {
  const card = useColorModeValue('white', 'gray.900')
  const border = useColorModeValue('#E4E4E7', 'whiteAlpha.200')
  const muted = useColorModeValue('#71717A', 'gray.400')

  if (customers.length === 0) {
    return (
      <Text
        color={muted}
        fontSize="sm"
      >
        Nenhum cliente encontrado
      </Text>
    )
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      gap={2}
    >
      {customers.map((customer) => (
        <Button
          bg={card}
          borderColor={border}
          borderRadius="12px"
          borderWidth="1px"
          display="block"
          h="auto"
          key={customer.id}
          minH="44px"
          onClick={() => onSelect(customer)}
          p={3}
          textAlign="left"
          type="button"
          variant="outline"
          w="full"
          whiteSpace="normal"
        >
          <Box
            alignItems="center"
            display="flex"
            justifyContent="space-between"
            mb={1}
          >
            <Text
              fontSize="15px"
              fontWeight="semibold"
            >
              {customer.name}
            </Text>
            <Box
              alignItems="center"
              display="flex"
              gap={1}
            >
              <Badge
                colorPalette="blue"
                variant="subtle"
              >
                {getCustomerCategoryLabel(customer)}
              </Badge>
              <LuChevronRight size={16} />
            </Box>
          </Box>
          <Box
            alignItems="center"
            color={muted}
            display="flex"
            fontSize="13px"
            gap={1}
          >
            <LuPhone size={14} />
            {customer.phone ? formatTelefone(customer.phone) : 'Sem telefone'}
          </Box>
          <Box
            display="flex"
            justifyContent="space-between"
            mt={2}
          >
            <Text
              color={muted}
              fontSize="12px"
            >
              {daysAgo(customer.lastOrderDate)}
            </Text>
            <Box textAlign="right">
              <Text
                color={muted}
                fontSize="11px"
              >
                Ticket médio
              </Text>
              <Text
                fontSize="14px"
                fontWeight="semibold"
              >
                {money(customer.averageTicket)}
              </Text>
            </Box>
          </Box>
        </Button>
      ))}
    </Box>
  )
}
