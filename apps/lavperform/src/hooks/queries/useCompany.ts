import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/react-query'
import {
  companyService,
  scheduleService,
  selfOnboardingService,
} from '@/services'
import type { Company, CompanyOpeningHour, Onboarding } from '@/types'

/**
 * Hook para buscar a lista de empresas
 */
export function useAllCompanies(
  params: {
    page?: number
    limit?: number
    orderBy?: string
    orderDirection?: 'asc' | 'desc'
    name?: string
  } = {}
) {
  return useQuery({
    queryKey: queryKeys.company.list(params),
    queryFn: async () => {
      const response = await companyService.getAllCompanies(params)
      return response.data
    },
    enabled: true,
    staleTime: 1000 * 60 * 10, // 10 minutos
  })
}

/**
 * Hook para criar onboarding de cliente e empresa
 */
export function useOnboarding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ data }: { data: Onboarding }) => {
      const response = await companyService.createOnboarding(data)
      return response.data
    },
    onSuccess: () => {
      // Invalida todas as queries que começam com ['company', 'list']
      queryClient.invalidateQueries({
        queryKey: ['company', 'list'],
        exact: false, // Invalida todas as queries que começam com essa chave
      })
    },
  })
}

/**
 * Hook para alterar o status da empresa
 */
export function useUpdateCompanyStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      companyId,
      state,
    }: {
      companyId: string
      state: 'PENDING' | 'ACTIVE' | 'INACTIVE'
    }) => {
      const response = await companyService.updateCompanyState(companyId, state)
      return response.data
    },
    onSuccess: () => {
      // Invalida todas as queries que começam com ['company', 'list']
      queryClient.invalidateQueries({
        queryKey: ['company', 'list'],
        exact: false, // Invalida todas as queries que começam com essa chave
      })
    },
  })
}

/**
 * Hook para buscar dados da empresa
 */
export function useCompany(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.company.detail(companyId || ''),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await companyService.getCompany(companyId)
      return response.data
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 10, // 10 minutos
  })
}

/**
 * Hook para buscar horário de funcionamento
 */
export function useCompanySchedule(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.company.schedule(companyId || ''),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await scheduleService.getOpeningHours(companyId)
      return response.data
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 10, // 10 minutos
  })
}

/**
 * Hook para atualizar dados da empresa
 */
export function useUpdateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      companyId,
      data,
    }: {
      companyId: string
      data: Partial<Company>
    }) => {
      const response = await companyService.updateCompany(companyId, data)
      return response.data
    },
    onSuccess: (_data, variables) => {
      // Invalida dados da empresa
      queryClient.invalidateQueries({
        queryKey: queryKeys.company.detail(variables.companyId),
      })
    },
  })
}

/**
 * Hook para atualizar horário de funcionamento
 */
export function useUpdateSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      companyId,
      openingHours,
    }: {
      companyId: string
      openingHours: CompanyOpeningHour[]
    }) => {
      const response = await scheduleService.saveOpeningHours(companyId, {
        openingHours,
      })
      return response.data
    },
    onSuccess: (_data, variables) => {
      // Invalida horários da empresa
      queryClient.invalidateQueries({
        queryKey: queryKeys.company.schedule(variables.companyId),
      })
    },
  })
}

/**
 * Hook para buscar todos os planos disponíveis
 */
export function useAllPlans() {
  return useQuery({
    queryKey: queryKeys.company.plans(),
    queryFn: async () => {
      const response = await selfOnboardingService.getAllPlans()
      return response.data
    },
    staleTime: 1000 * 60 * 30, // 30 minutos - planos não mudam com frequência
  })
}

/**
 * Hook para buscar dados do parceiro de negócios
 */
export function usePartner(partnerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.company.partner(partnerId || ''),
    queryFn: async () => {
      if (!partnerId) throw new Error('Partner ID is required')
      const response = await selfOnboardingService.getPartner(partnerId)
      return response.data
    },
    enabled: !!partnerId,
    staleTime: 1000 * 60 * 30, // 30 minutos - dados do parceiro não mudam com frequência
  })
}

/**
 * Tipagens para retorno dos hooks
 */
export type CompanyData = Company
