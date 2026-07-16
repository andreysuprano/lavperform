import { Center, Spinner, Stack, Text } from '@chakra-ui/react'
import { memo } from 'react'

import { useWhiteLabel } from '@/config'

import { Props } from './LoadingState.types'

function LoadingStateBase({ title }: Props) {
  const { colors } = useWhiteLabel()

  return (
    <Center
      minH="200px"
      w="100%"
    >
      <Stack
        align="center"
        gap={4}
      >
        <Spinner
          color={colors.primary}
          size="xl"
        />
        <Text
          color="fg.muted"
          fontSize="sm"
        >
          {title ? title : 'Carregando...'}
        </Text>
      </Stack>
    </Center>
  )
}

const LoadingState = memo(LoadingStateBase) as typeof LoadingStateBase

export { LoadingState, type Props as LoadingStateProps }
