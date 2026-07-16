import { Badge } from '@chakra-ui/react'

import type { MetaTemplateStatus } from '@/types/metaTemplate.types'

import {
  META_TEMPLATE_STATUS_COLORS,
  META_TEMPLATE_STATUS_LABELS,
} from './metaTemplate.utils'

type Props = {
  status: MetaTemplateStatus
}

export function MetaTemplateStatusBadge({ status }: Props) {
  return (
    <Badge
      colorPalette={META_TEMPLATE_STATUS_COLORS[status]}
      variant="subtle"
    >
      {META_TEMPLATE_STATUS_LABELS[status]}
    </Badge>
  )
}
