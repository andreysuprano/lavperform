import { PiMonitorPlay } from 'react-icons/pi'
import { useParams } from 'react-router-dom'

import { AppContentLayout } from '@/components'
import { AcademyLessonPlayer } from '@/components/features'

export function AcademyLessonPage() {
  const { courseId, lessonId } = useParams<{
    courseId: string
    lessonId: string
  }>()

  return (
    <AppContentLayout
      icon={<PiMonitorPlay />}
      title="Academy - Aula"
    >
      <AcademyLessonPlayer
        courseId={courseId!}
        lessonId={lessonId!}
      />
    </AppContentLayout>
  )
}
