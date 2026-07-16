import { SimpleGrid } from '@chakra-ui/react'
import { Fragment } from 'react'

import { RecurringCampaignItemCardSkeleton } from '../RecurringCampaignItemCard/RecurringCampaignItemCardSkeleton'

const SKELETON_COUNT = 6

function RecurringCampaignListSkeleton() {
  return (
    <SimpleGrid
      columns={{ base: 1, lg: 2, xl: 3, '2xl': 4 }}
      gap={3}
      w="full"
    >
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <Fragment key={index}>
          <RecurringCampaignItemCardSkeleton />
        </Fragment>
      ))}
    </SimpleGrid>
  )
}

export { RecurringCampaignListSkeleton }
