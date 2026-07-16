import type {
  CarrouselItem,
  Course,
  CreateCarrouselItemPayload,
  CreateCoursePayload,
  CreateModulePayload,
  CreateWeekEventPayload,
  Module,
  UpdateCarrouselItemPayload,
  UpdateWeekEventPayload,
  WeekEvent,
} from '@/types'

import { client } from './client'

export const courseService = {
  async getAllCourses(data?: { page?: number; limit?: number }) {
    return await client.get<Course[]>('/courses', {
      params: data,
    })
  },

  async createCourse(payload: CreateCoursePayload) {
    return await client.post<Course>('/courses', payload)
  },

  async getCourse(courseId: string) {
    return await client.get<Course>(`/courses/${courseId}`)
  },

  async createModule(courseId: string, payload: CreateModulePayload) {
    return await client.post<Module>(`/courses/${courseId}/modules`, payload)
  },

  async getCarrouselItems() {
    return await client.get<CarrouselItem[]>('/courses/educational-carrousel')
  },

  async createCarrouselItem(payload: CreateCarrouselItemPayload) {
    return await client.post<CarrouselItem>(
      '/courses/educational-carrousel',
      payload
    )
  },

  async updateCarrouselItem(id: string, payload: UpdateCarrouselItemPayload) {
    return await client.put<CarrouselItem>(
      `/courses/educational-carrousel/${id}`,
      payload
    )
  },

  async deleteCarrouselItem(id: string) {
    return await client.delete(`/courses/educational-carrousel/${id}`)
  },

  async getCurrentWeekEvents() {
    return await client.get<WeekEvent[]>(
      '/courses/educational-week-events/current-week'
    )
  },

  async getAllWeekEvents() {
    return await client.get<WeekEvent[]>('/courses/educational-week-events')
  },

  async createWeekEvent(payload: CreateWeekEventPayload) {
    return await client.post<WeekEvent>(
      '/courses/educational-week-events',
      payload
    )
  },

  async updateWeekEvent(id: string, payload: UpdateWeekEventPayload) {
    return await client.put<WeekEvent>(
      `/courses/educational-week-events/${id}`,
      payload
    )
  },

  async deleteWeekEvent(id: string) {
    return await client.delete(`/courses/educational-week-events/${id}`)
  },
}
