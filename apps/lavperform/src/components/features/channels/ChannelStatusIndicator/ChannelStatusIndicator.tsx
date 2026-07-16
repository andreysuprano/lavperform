import { Box } from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import { memo } from 'react'

import type { Props } from './ChannelStatusIndicator.types'

const pulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`

const ChannelStatusIndicatorBase = ({ isConnected }: Props) => {
  return (
    <Box
      animation={`${pulse} 2s infinite`}
      bg={isConnected ? 'green.500' : 'red.500'}
      borderRadius="full"
      flexShrink={0}
      h="8px"
      w="8px"
    />
  )
}

const ChannelStatusIndicator = memo(
  ChannelStatusIndicatorBase
) as typeof ChannelStatusIndicatorBase

export { ChannelStatusIndicator, type Props as ChannelStatusIndicatorProps }
