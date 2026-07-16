import type { Lesson } from '@/types'

export type Props = {
  lesson: Lesson
  lessonNumber: number
  isActive?: boolean
  onClick?: () => void
  showThumbnail?: boolean
}
