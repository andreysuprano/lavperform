import { LuCalendarSync } from 'react-icons/lu'

import { AppContentLayout, RecurringCampaignList } from '@/components'

export function RecurringCampaignPage() {
  return (
    <AppContentLayout
      icon={<LuCalendarSync />}
      title="Campanhas"
    >
      <RecurringCampaignList />
    </AppContentLayout>
  )
}
