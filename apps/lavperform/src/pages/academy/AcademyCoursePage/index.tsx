import { PiMonitorPlay } from 'react-icons/pi'
import { useParams } from 'react-router-dom'

import { AppContentLayout } from '@/components'
import { AcademyCourseDetail } from '@/components/features'

export function AcademyCoursePage() {
  const { courseId } = useParams<{ courseId: string }>()

  return (
    <AppContentLayout
      icon={<PiMonitorPlay />}
      title="Academy - Curso"
    >
      <AcademyCourseDetail courseId={courseId!} />
    </AppContentLayout>
  )
}
