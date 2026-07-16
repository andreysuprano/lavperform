import { EmptyState, VStack } from '@chakra-ui/react'
import { memo } from 'react'
import { PiEmpty } from 'react-icons/pi'

import { Props } from './Empty.types'

function EmptyBase({
  description,
  icon: Icon,
  title = 'Nenhum registro encontrado',
}: Props) {
  return (
    <EmptyState.Root>
      <EmptyState.Content>
        <EmptyState.Indicator>
          {Icon ? <Icon /> : <PiEmpty />}
        </EmptyState.Indicator>
        <VStack textAlign="center">
          <EmptyState.Title>{title}</EmptyState.Title>
          {description && (
            <EmptyState.Description>{description}</EmptyState.Description>
          )}
        </VStack>
      </EmptyState.Content>
    </EmptyState.Root>
  )
}

const Empty = memo(EmptyBase) as typeof EmptyBase

export { Empty, type Props as EmptyProps }
