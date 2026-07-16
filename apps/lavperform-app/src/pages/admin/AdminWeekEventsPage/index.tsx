import { PiCalendarCheck } from 'react-icons/pi'

import { AppContentLayout, WeekEventList } from '@/components'

export function AdminWeekEventsPage() {
  return (
    <AppContentLayout
      icon={<PiCalendarCheck />}
      title="Eventos da Semana"
    >
      <WeekEventList />
    </AppContentLayout>
  )
}
