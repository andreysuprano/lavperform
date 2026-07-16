import { HStack } from '@chakra-ui/react'
import { memo } from 'react'

import { Props } from './Row.types'

function RowBase({ children, ...rest }: Props) {
  return (
    <HStack
      alignItems="flex-start"
      flexDirection={{ base: 'column', md: 'row' }}
      gap={4}
      w="full"
      {...rest}
    >
      {children}
    </HStack>
  )
}

const Row = memo(RowBase) as typeof RowBase

export { Row, type Props as RowProps }
