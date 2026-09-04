import { Box, HStack, VStack, Text } from '@chakra-ui/react'
import { memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import type { Props } from './ChannelDropdownCard.types'

const ChannelDropdownCardBase = ({
  name,
  icon: Icon,
  badge,
  subtitle,
  statusIndicator,
}: Props) => {
  const navigate = useNavigate()

  const handleClick = useCallback(() => navigate('/channels'), [navigate])

  return (
    <HStack
      borderRadius="md"
      borderWidth="1px"
      borderColor="border"
      cursor="pointer"
      gap={3}
      onClick={handleClick}
      px={3}
      py={2}
      transition="background 0.15s, border-color 0.15s"
      w="full"
      _hover={{ bg: 'bg.subtle', borderColor: 'border.emphasized' }}
    >
      <Box
        alignItems="center"
        bg="bg.muted"
        borderRadius="md"
        color="fg.muted"
        display="flex"
        flexShrink={0}
        fontSize="lg"
        h={9}
        justifyContent="center"
        w={9}
      >
        <Icon />
      </Box>
      <VStack align="start" flex={1} gap={0.5}>
        <Text
          fontSize="sm"
          fontWeight="medium"
        >
          {name}
        </Text>
        {badge && <Box>{badge}</Box>}
        {subtitle && (
          <Text
            color="fg.muted"
            fontSize="xs"
          >
            {subtitle}
          </Text>
        )}
      </VStack>
      {statusIndicator && (
        <Box flexShrink={0}>{statusIndicator}</Box>
      )}
    </HStack>
  )
}

const ChannelDropdownCard = memo(
  ChannelDropdownCardBase
) as typeof ChannelDropdownCardBase

export { ChannelDropdownCard, type Props as ChannelDropdownCardProps }
