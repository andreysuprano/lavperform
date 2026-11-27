import { Box, Text } from '@chakra-ui/react'
import { memo } from 'react'

/** Mostra o que sai e o que entra no contexto de negócio antes de a pessoa aceitar. */
function ContextChangeBase({ before, after }: { before: string; after: string }) {
  return (
    <Box fontSize="sm">
      {before ? (
        <>
          <Text color="fg.muted">{after ? 'Sai' : 'Remover'}</Text>
          <Text color="fg.muted" textDecoration="line-through" whiteSpace="pre-wrap">
            {before}
          </Text>
        </>
      ) : null}
      {after ? (
        <>
          <Text color="fg.muted">{before ? 'Entra' : 'Acrescentar'}</Text>
          <Text whiteSpace="pre-wrap">{after}</Text>
        </>
      ) : null}
    </Box>
  )
}

const ContextChange = memo(ContextChangeBase)

export { ContextChange }
