import { LuCalendarClock } from 'react-icons/lu'

import { AppContentLayout, ScheduledDispatchList } from '@/components'

export function ScheduledDispatchesPage() {
  return (
    <AppContentLayout
      icon={<LuCalendarClock />}
      title="Disparos Programados"
    >
      <ScheduledDispatchList />
    </AppContentLayout>
  )
}
