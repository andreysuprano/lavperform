import { Badge, Box, HStack, Skeleton, Stack, Text } from '@chakra-ui/react'
import { LuWallet } from 'react-icons/lu'

import { useCreditBalance } from '@/hooks/queries'

import { formatCreditCents, formatDateTime } from '../utils'
import { CreateTopupModal } from '../topups/TopupList/TopupList'

interface Props {
  companyId?: string
  showTopup?: boolean
}

export function BalanceCard({ companyId, showTopup = false }: Props) {
  const { data, isLoading } = useCreditBalance(companyId)

  return (
    <Box
      bg="bg"
      borderRadius="lg"
      borderWidth="1px"
      p={5}
    >
      <HStack
        justify="space-between"
        mb={3}
      >
        <HStack>
          <LuWallet />
          <Text
            color="fg.muted"
            fontWeight="medium"
          >
            Saldo atual
          </Text>
        </HStack>
        <Badge colorPalette="green">Créditos</Badge>
      </HStack>
      {isLoading ? (
        <Skeleton height="42px" />
      ) : (
        <>
          <Text
            fontSize={{ base: '3xl', md: '4xl' }}
            fontWeight="bold"
          >
            {formatCreditCents(data?.balanceCents ?? 0)}
          </Text>
          <Text
            color="fg.muted"
            fontSize="sm"
            mt={2}
          >
            Atualizado em {formatDateTime(data?.updatedAt)}
          </Text>
        </>
      )}
      {showTopup && companyId && (
        <Stack
          mt={5}
          pt={4}
          borderTopWidth="1px"
        >
          <CreateTopupModal companyId={companyId} />
        </Stack>
      )}
    </Box>
  )
}
