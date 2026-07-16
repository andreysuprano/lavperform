import { PiMonitorPlay } from 'react-icons/pi'

import { AppContentLayout, CourseList } from '@/components'

export function AdminCoursePage() {
  return (
    <AppContentLayout
      icon={<PiMonitorPlay />}
      title="Cursos"
    >
      <CourseList />
    </AppContentLayout>
  )
}
