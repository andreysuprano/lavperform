import { PiSlideshowBold } from 'react-icons/pi'

import { AppContentLayout, CarrouselItemList } from '@/components'

export function AdminCarrouselPage() {
  return (
    <AppContentLayout
      icon={<PiSlideshowBold />}
      title="Carrousel Educacional"
    >
      <CarrouselItemList />
    </AppContentLayout>
  )
}
