import { Bleed } from '@chakra-ui/react'

import { FoodAdsEmbedFrame } from '../FoodAdsEmbedFrame'

export function FoodAdsOverviewPage() {
  return (
    <Bleed
      blockEnd={{ base: '4', md: '6' }}
      blockStart={{ base: '4', md: '6' }}
      inline={{ base: '4', md: '6' }}
    >
      <FoodAdsEmbedFrame screen="overview" />
    </Bleed>
  )
}
