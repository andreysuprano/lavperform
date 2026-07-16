import type { Module } from '@/types'

export type Props = {
  modules: Module[]
  currentLessonId?: string
  onLessonClick: (lessonId: string) => void
  defaultOpenModule?: string
}
