import { Badge } from '@chakra-ui/react'
import { memo } from 'react'

function ActiveChannelBadgeBase() {
  return (
    <Badge
      colorPalette="green"
      size="xs"
      variant="subtle"
    >
      Ativo
    </Badge>
  )
}

const ActiveChannelBadge = memo(ActiveChannelBadgeBase) as typeof ActiveChannelBadgeBase

ActiveChannelBadge.displayName = 'ActiveChannelBadge'

export { ActiveChannelBadge }
