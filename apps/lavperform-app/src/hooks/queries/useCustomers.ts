import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { invalidateQueries, queryKeys } from '@/lib/react-query'
import { customerService } from '@/services'
import type {
  Customer,
  CustomerFormData,
  CustomerImport,
  ImportWhatsAppCustomersRequest,
  WhatsAppCustomer,
} from '@/types'

/**
 * Hook para listar clientes com paginação
 */
export function useCustomers(
  companyId: string | undefined,
  params: {
    page?: number
    limit?: number
    orderBy?: string
    orderDirection?: 'asc' | 'desc'
    name?: string
    rfvClassification?: string[]
    hasEmail?: boolean
    hasBirthDate?: boolean
    whatsappOptin?: boolean
    whatsappVerified?: boolean
    hasOrders?: boolean
  } = {}
) {
  return useQuery({
    queryKey: queryKeys.customers.list(companyId || '', params),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await customerService.listCustomers(companyId, params)
      return response.data
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para buscar resumo de clientes
 */
export function useCustomersSummary(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customers.summary(companyId || ''),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await customerService.listCustomersSummary(companyId)
      return response.data
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Ranking de clientes que mais compram (por valor ou número de vendas)
 */
export function useTopBuyers(
  companyId: string | undefined,
  limit = 10,
  sortBy: 'totalSpent' | 'orderCount' = 'totalSpent'
) {
  return useQuery({
    queryKey: queryKeys.customers.topBuyers(companyId || '', limit, sortBy),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await customerService.getTopBuyers(
        companyId,
        limit,
        sortBy
      )
      return response.data.items
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Hook para buscar vendas de um cliente
 */
export function useCustomerOrders(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customers.orders(customerId || ''),
    queryFn: async () => {
      if (!customerId) throw new Error('Customer ID is required')
      const response = await customerService.listCustomerOrders(customerId)
      return response.data.orders
    },
    enabled: !!customerId,
    staleTime: 1000 * 60 * 2, // 2 minutos
  })
}

/**
 * Hook para criar cliente
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      companyId,
      data,
    }: {
      companyId: string
      data: CustomerFormData
    }) => {
      const response = await customerService.createCustomer(companyId, data)
      return response.data
    },
    onSuccess: (_data, variables) => {
      // Invalida lista de clientes e resumo
      invalidateQueries.customersList(variables.companyId)
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.summary(variables.companyId),
      })
    },
  })
}

/**
 * Hook para atualizar cliente
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      companyId,
      customerId,
      data,
    }: {
      companyId: string
      customerId: string
      data: CustomerFormData
    }) => {
      const response = await customerService.updateCustomer(
        companyId,
        customerId,
        data
      )
      return response.data
    },
    onSuccess: (_data, variables) => {
      // Invalida lista e detalhe do cliente
      invalidateQueries.customersList(variables.companyId)
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.customerId),
      })
    },
  })
}

/**
 * Hook para deletar cliente
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      companyId,
      customerId,
    }: {
      companyId: string
      customerId: string
    }) => {
      await customerService.deleteCustomer(companyId, customerId)
      return { success: true }
    },
    onSuccess: (_data, variables) => {
      // Invalida lista de clientes, resumo e dashboard
      invalidateQueries.customersList(variables.companyId)
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.summary(variables.companyId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.customers(variables.companyId),
      })
    },
  })
}

/**
 * Hook para importar clientes
 */
export function useImportCustomers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      companyId,
      customers,
    }: {
      companyId: string
      customers: CustomerImport[]
    }) => {
      const response = await customerService.importCustomers(
        companyId,
        customers
      )
      return response.data
    },
    onSuccess: (_data, variables) => {
      // Invalida lista de clientes e resumo
      invalidateQueries.customersList(variables.companyId)
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.summary(variables.companyId),
      })
    },
  })
}

/**
 * Hook para buscar clientes do WhatsApp para importação
 */
export function useWhatsAppCustomers(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.whatsapp.customers(companyId || ''),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await customerService.getWhatsAppCustomers(companyId)
      return response
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para importar clientes do WhatsApp
 */
export function useImportWhatsAppCustomers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      companyId,
      customers,
    }: {
      companyId: string
      customers: WhatsAppCustomer[]
    }) => {
      return await customerService.importWhatsAppCustomers(companyId, customers)
    },
    onSuccess: (_data, variables) => {
      // Invalida lista de clientes, resumo e clientes do WhatsApp
      invalidateQueries.customersList(variables.companyId)
      invalidateQueries.whatsappCustomers(variables.companyId)
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.summary(variables.companyId),
      })
    },
  })
}

/**
 * Tipagens para retorno dos hooks
 */
export type CustomerData = Customer
export type WhatsAppCustomerData = WhatsAppCustomer
