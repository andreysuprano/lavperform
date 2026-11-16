import { Box } from '@chakra-ui/react'
import type { ReactNode } from 'react'

import { useColorModeValue } from '@/components/ui/color-mode'

import { shellDark } from './shellPalette'
import { useShellMode } from './useShellMode'

export function StickySaveBar({ children }: { children: ReactNode }) {
  const phone = useShellMode() === 'phone'
  const background = useColorModeValue('white', shellDark.card)
  const border = useColorModeValue('#E4E4E7', shellDark.border)

  if (!phone) {
    return (
      <Box
        bg="none"
        bottom={0}
        left={0}
        mt={4}
        position="sticky"
        right={0}
        zIndex={10}
      >
        {children}
      </Box>
    )
  }

  return (
    <>
      <Box h="88px" />
      <Box
        bg={background}
        borderColor={border}
        borderTopWidth="1px"
        bottom="calc(56px + env(safe-area-inset-bottom, 0px))"
        css={{ '& button': { minHeight: '44px', width: '100%' } }}
        data-testid="sticky-save-bar"
        left={0}
        position="fixed"
        px={4}
        py={3}
        right={0}
        zIndex={25}
      >
        {children}
      </Box>
    </>
  )
}
