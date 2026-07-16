import { PiHandshake } from 'react-icons/pi'

import { AppContentLayout, PartnerList } from '@/components'

export function AdminPartnerPage() {
  return (
    <AppContentLayout
      icon={<PiHandshake />}
      title="Parceiros"
    >
      <PartnerList />
    </AppContentLayout>
  )
}
