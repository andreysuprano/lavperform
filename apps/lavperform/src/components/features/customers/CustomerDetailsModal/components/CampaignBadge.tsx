import { Badge } from '@chakra-ui/react'
import { RiMegaphoneLine } from 'react-icons/ri'
import { Link } from 'react-router-dom'

import type { Campaign } from './TimelineEvent.types'

interface Props {
  campaign: Campaign
}

export function CampaignBadge({ campaign }: Props) {
  return (
    <Link to={`/campaigns/${campaign.id}`}>
      <Badge
        colorPalette="purple"
        cursor="pointer"
        variant="subtle"
        _hover={{ bg: 'purple.100' }}
      >
        <RiMegaphoneLine />
        {campaign.name}
      </Badge>
    </Link>
  )
}
