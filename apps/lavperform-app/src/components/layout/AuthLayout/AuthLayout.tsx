import { Box } from '@chakra-ui/react'
import { memo } from 'react'

import type { Props } from './AuthLayout.types'

function AuthLayoutBase({ children }: Props) {
  return (
    <Box
      bg="bg"
      minH="100vh"
      w="100vw"
    >
      {children}
    </Box>
  )
}

const AuthLayout = memo(AuthLayoutBase) as typeof AuthLayoutBase

export { AuthLayout, type Props as AuthLayoutProps }
