import type { Course } from '@/types'

export type Props = {
  course: Course
  onViewCourse: (courseId: string) => void
}
