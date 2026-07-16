import { Badge } from '@chakra-ui/react'
import { memo } from 'react'

function ComingSoonBadgeBase() {
  return (
    <Badge colorPalette="gray" size="xs" variant="subtle">
      Em breve
    </Badge>
  )
}

const ComingSoonBadge = memo(ComingSoonBadgeBase) as typeof ComingSoonBadgeBase

ComingSoonBadge.displayName = 'ComingSoonBadge'

export { ComingSoonBadge }
