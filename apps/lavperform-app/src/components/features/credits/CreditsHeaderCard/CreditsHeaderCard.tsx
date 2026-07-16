import { Box, Button, HStack, Skeleton, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { LuEye, LuEyeOff, LuWallet } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import { useCreditBalance } from '@/hooks/queries'
import { formatCreditCents } from '@/components/features/admin/credits/utils'

export function CreditsHeaderCard() {
  const { selectedCompany } = useAuth()
  const { data, isLoading } = useCreditBalance(selectedCompany?.id)
  const navigate = useNavigate()

  const [visible, setVisible] = useState(() => {
    return localStorage.getItem('@FoodCRM:creditsVisible') !== 'false'
  })

  const handleToggleVisible = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !visible
    setVisible(next)
    localStorage.setItem('@FoodCRM:creditsVisible', String(next))
  }

  return (
    <Button
      display={{ base: 'none', lg: 'flex' }}
      gap={1.5}
      onClick={() => navigate('/settings/wallet')}
      px={2.5}
      size="sm"
      variant="outline"
    >
      <LuWallet size={14} />
      {isLoading ? (
        <Skeleton
          height="14px"
          width="56px"
        />
      ) : (
        <HStack gap={1}>
          <Text fontSize="sm">
            {visible ? formatCreditCents(data?.balanceCents ?? 0) : '••••••'}
          </Text>
        </HStack>
      )}
      <Box
        _hover={{ opacity: 0.7 }}
        as="span"
        color="fg.muted"
        cursor="pointer"
        display="flex"
        onClick={handleToggleVisible}
        pl={0.5}
      >
        {visible ? <LuEyeOff size={13} /> : <LuEye size={13} />}
      </Box>
    </Button>
  )
}
