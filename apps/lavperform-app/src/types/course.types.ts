export interface LessonFile {
  id: string
  name: string
  lessonId: string
  fileUrl: string
  createdAt: string
  updatedAt: string
}

export interface Lesson {
  id: string
  title: string
  description: string | null
  videoUrl: string
  thumbnailUrl: string
  createdAt: string
  updatedAt: string
  moduleId: string
  lessonFiles: LessonFile[]
}

export interface Module {
  id: string
  title: string
  description: string
  order: number
  createdAt: string
  updatedAt: string
  courseId: string
  lessons: Lesson[]
}

export interface Course {
  id: string
  title: string
  description: string
  coverImageUrl: string
  bannerUrl: string
  createdAt: string
  updatedAt: string
  modules?: Module[]
}

export interface CreateCoursePayload {
  title: string
  description: string
  coverImageUrl: string
}

export interface CreateModulePayload {
  title: string
  description: string
  lessons: {
    title: string
    videoUrl: string
    description?: string
    thumbnailUrl?: string
    lessonFiles?: {
      name: string
      fileUrl: string
    }[]
  }[]
}

export interface CourseListResponse {
  items: Course[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface CarrouselItem {
  id: string
  title: string
  description: string
  videoUrl: string
  thumbnailUrl: string
  ctaLabel: string
  ctaUrl: string
  order: number
  isStream: boolean
  createdAt: string
  updatedAt: string
}

export interface WeekEvent {
  id: string
  title: string
  description: string
  coverImage: string
  ctaLabel: string
  ctaUrl: string
  eventDate: string
  isStream: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateCarrouselItemPayload {
  title: string
  description: string
  videoUrl?: string
  thumbnailUrl: string
  ctaLabel: string
  ctaUrl: string
  order: number
  isStream: boolean
}

export interface UpdateCarrouselItemPayload {
  title: string
  description: string
  videoUrl?: string
  thumbnailUrl: string
  ctaLabel: string
  ctaUrl: string
  order: number
  isStream: boolean
}

export interface CreateWeekEventPayload {
  title: string
  description: string
  coverImage: string
  ctaLabel: string
  ctaUrl: string
  isStream: boolean
  eventDate: string
}

export interface UpdateWeekEventPayload {
  title: string
  description: string
  coverImage: string
  ctaLabel: string
  ctaUrl: string
  isStream: boolean
  eventDate: string
}
