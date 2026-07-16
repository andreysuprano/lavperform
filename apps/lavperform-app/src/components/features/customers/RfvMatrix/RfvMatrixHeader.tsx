import { Alert, Stack, Text } from '@chakra-ui/react'
import { memo } from 'react'

function RfvMatrixHeaderBase() {
  return (
    <Stack gap={2}>
      <Text
        fontSize={{ base: 'lg', md: 'xl' }}
        fontWeight="bold"
      >
        Matriz RFV - Recência, Frequência e Valor
      </Text>
    </Stack>
  )
}

const RfvMatrixHeader = memo(RfvMatrixHeaderBase)

export { RfvMatrixHeader }
