import { LuClock } from 'react-icons/lu'

import { AppContentLayout, AttributionWindowView } from '@/components'

export function AttributionWindowPage() {
  return (
    <AppContentLayout
      icon={<LuClock />}
      title="Janela de Atribuição"
    >
      <AttributionWindowView />
    </AppContentLayout>
  )
}

