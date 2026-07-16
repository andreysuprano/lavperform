import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/react-query'
import { courseService } from '@/services'
import type {
  Course,
  CreateCarrouselItemPayload,
  CreateCoursePayload,
  CreateModulePayload,
  CreateWeekEventPayload,
  UpdateCarrouselItemPayload,
  UpdateWeekEventPayload,
} from '@/types'

/**
 * Hook para buscar a lista de cursos
 */
export function useAllCourses(
  params: {
    page?: number
    limit?: number
  } = {}
) {
  return useQuery({
    queryKey: queryKeys.courses.list(params),
    queryFn: async () => {
      const response = await courseService.getAllCourses(params)
      return response.data
    },
    enabled: true,
    staleTime: 1000 * 60 * 10, // 10 minutos
  })
}

/**
 * Hook para criar um novo curso
 */
export function useCreateCourse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCoursePayload) => {
      const response = await courseService.createCourse(data)
      return response.data
    },
    onSuccess: () => {
      // Invalida todas as queries que começam com ['courses', 'list']
      queryClient.invalidateQueries({
        queryKey: ['courses', 'list'],
        exact: false,
      })
    },
  })
}

/**
 * Hook para buscar dados de um curso específico
 */
export function useCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.courses.detail(courseId || ''),
    queryFn: async () => {
      if (!courseId) throw new Error('Course ID is required')
      const response = await courseService.getCourse(courseId)
      return response.data
    },
    enabled: !!courseId,
    staleTime: 1000 * 60 * 10, // 10 minutos
  })
}

/**
 * Hook para criar um novo módulo em um curso
 */
export function useCreateModule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      courseId,
      data,
    }: {
      courseId: string
      data: CreateModulePayload
    }) => {
      const response = await courseService.createModule(courseId, data)
      return response.data
    },
    onSuccess: (_data, variables) => {
      // Invalida o curso específico para recarregar os módulos
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.detail(variables.courseId),
      })
    },
  })
}

/**
 * Tipagens para retorno dos hooks
 */
export type CourseData = Course

/**
 * Hook para buscar os itens do carrousel
 */
export function useCarrouselItems() {
  return useQuery({
    queryKey: queryKeys.courses.carrousel(),
    queryFn: async () => {
      const response = await courseService.getCarrouselItems()
      return response.data
    },
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para buscar os eventos da semana atual
 */
export function useCurrentWeekEvents() {
  return useQuery({
    queryKey: queryKeys.courses.weekEvents(),
    queryFn: async () => {
      const response = await courseService.getCurrentWeekEvents()
      return response.data
    },
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para buscar todos os eventos da semana (admin)
 */
export function useAllWeekEvents() {
  return useQuery({
    queryKey: queryKeys.courses.allWeekEvents(),
    queryFn: async () => {
      const response = await courseService.getAllWeekEvents()
      return response.data
    },
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para criar um novo item do carrousel
 */
export function useCreateCarrouselItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCarrouselItemPayload) => {
      const response = await courseService.createCarrouselItem(data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.carrousel(),
      })
    },
  })
}

/**
 * Hook para atualizar um item do carrousel
 */
export function useUpdateCarrouselItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: UpdateCarrouselItemPayload
    }) => {
      const response = await courseService.updateCarrouselItem(id, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.carrousel(),
      })
    },
  })
}

/**
 * Hook para deletar um item do carrousel
 */
export function useDeleteCarrouselItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await courseService.deleteCarrouselItem(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.carrousel(),
      })
    },
  })
}

/**
 * Hook para criar um novo evento da semana
 */
export function useCreateWeekEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateWeekEventPayload) => {
      const response = await courseService.createWeekEvent(data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.allWeekEvents(),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.weekEvents(),
      })
    },
  })
}

/**
 * Hook para atualizar um evento da semana
 */
export function useUpdateWeekEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: UpdateWeekEventPayload
    }) => {
      const response = await courseService.updateWeekEvent(id, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.allWeekEvents(),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.weekEvents(),
      })
    },
  })
}

/**
 * Hook para deletar um evento da semana
 */
export function useDeleteWeekEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await courseService.deleteWeekEvent(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.allWeekEvents(),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.weekEvents(),
      })
    },
  })
}
