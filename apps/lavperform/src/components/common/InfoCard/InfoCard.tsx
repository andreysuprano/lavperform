import { Card, Stack, Text } from '@chakra-ui/react'
import { memo } from 'react'

import type { Props } from './InfoCard.types'

function InfoCardBase({ title, description, children }: Props) {
  return (
    <Card.Root>
      <Card.Body>
        <Stack gap={2}>
          <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold">
            {title}
          </Text>
          <Text color="fg.muted" fontSize="sm" whiteSpace="pre-line">
            {description}
          </Text>
          {children}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

const InfoCard = memo(InfoCardBase) as typeof InfoCardBase

export { InfoCard, type Props as InfoCardProps }
