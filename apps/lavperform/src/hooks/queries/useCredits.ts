import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/react-query'
import { creditsService } from '@/services'
import type {
  CreateDefaultProductPayload,
  CreateCreditProductPayload,
  CreateCreditTopupPayload,
  CreditLedgerEntry,
  CreditLedgerListParams,
  CreditProduct,
  CreditProductListParams,
  CreditTopup,
  CreditTopupListParams,
  DefaultProductListParams,
  EffectiveProduct,
  EffectiveProductListParams,
  PaginatedCreditsResponse,
  UpdateDefaultProductPayload,
  UpdateCreditProductPayload,
  UpdateCreditTopupStatusPayload,
} from '@/types'

function normalizePaginated<T>(raw: unknown): PaginatedCreditsResponse<T> {
  const r = raw as Record<string, unknown>
  return {
    items: ((r.items ?? r.data ?? []) as T[]),
    meta: r.meta as PaginatedCreditsResponse<T>['meta'],
  }
}

const invalidateCredits = (
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string
) => {
  queryClient.invalidateQueries({
    queryKey: ['credits', companyId],
    exact: false,
  })
}

const invalidateEffectiveProducts = (
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string
) => {
  queryClient.invalidateQueries({
    queryKey: queryKeys.credits.effectiveProducts.all(companyId),
  })
}

const invalidateAllEffectiveProducts = (
  queryClient: ReturnType<typeof useQueryClient>
) => {
  queryClient.invalidateQueries({
    predicate: (query) => query.queryKey.includes('effective-products'),
  })
}

export function useDefaultProducts(params?: DefaultProductListParams) {
  return useQuery({
    queryKey: queryKeys.credits.defaultProducts.list(params),
    queryFn: async () => {
      const response = await creditsService.listDefaultProducts(params)
      return response.data ?? []
    },
    refetchOnMount: true,
  })
}

export function useDefaultProduct(defaultProductId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.credits.defaultProducts.detail(defaultProductId || ''),
    queryFn: async () => {
      if (!defaultProductId) throw new Error('Default product ID is required')
      const response = await creditsService.getDefaultProduct(defaultProductId)
      return response.data
    },
    enabled: !!defaultProductId,
  })
}

export function useCreateDefaultProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateDefaultProductPayload) => {
      const response = await creditsService.createDefaultProduct(payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.credits.defaultProducts.all,
      })
      invalidateAllEffectiveProducts(queryClient)
    },
  })
}

export function useUpdateDefaultProduct(defaultProductId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateDefaultProductPayload) => {
      const response = await creditsService.updateDefaultProduct(
        defaultProductId,
        payload
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.credits.defaultProducts.all,
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.credits.defaultProducts.detail(defaultProductId),
      })
      invalidateAllEffectiveProducts(queryClient)
    },
  })
}

export function useToggleDefaultProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (defaultProductId: string) => {
      const response =
        await creditsService.toggleDefaultProductActive(defaultProductId)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.credits.defaultProducts.all,
      })
      invalidateAllEffectiveProducts(queryClient)
    },
  })
}

export function useDeleteDefaultProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (defaultProductId: string) => {
      await creditsService.deleteDefaultProduct(defaultProductId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.credits.defaultProducts.all,
      })
      invalidateAllEffectiveProducts(queryClient)
    },
  })
}

export function useRestoreDefaultProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (defaultProductId: string) => {
      const response =
        await creditsService.restoreDefaultProduct(defaultProductId)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.credits.defaultProducts.all,
      })
      invalidateAllEffectiveProducts(queryClient)
    },
  })
}

export function useCreditProducts(
  companyId: string | undefined,
  params?: CreditProductListParams
) {
  return useQuery({
    queryKey: queryKeys.credits.products.list(companyId || '', params),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await creditsService.listProducts(companyId, params)
      return normalizePaginated<CreditProduct>(response.data)
    },
    enabled: !!companyId,
  })
}

export function useCreditProduct(
  companyId: string | undefined,
  productId: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.credits.products.detail(
      companyId || '',
      productId || ''
    ),
    queryFn: async () => {
      if (!companyId || !productId) throw new Error('Product ID is required')
      const response = await creditsService.getProduct(companyId, productId)
      return response.data
    },
    enabled: !!companyId && !!productId,
  })
}

export function useCreateCreditProduct(companyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateCreditProductPayload) => {
      const response = await creditsService.createProduct(companyId, payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.credits.products.all(companyId),
      })
      invalidateEffectiveProducts(queryClient, companyId)
    },
  })
}

export function useUpdateCreditProduct(companyId: string, productId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateCreditProductPayload) => {
      const response = await creditsService.updateProduct(
        companyId,
        productId,
        payload
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.credits.products.all(companyId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.credits.products.detail(companyId, productId),
      })
      invalidateEffectiveProducts(queryClient, companyId)
    },
  })
}

export function useToggleCreditProduct(companyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (productId: string) => {
      const response = await creditsService.toggleProductActive(
        companyId,
        productId
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.credits.products.all(companyId),
      })
      invalidateEffectiveProducts(queryClient, companyId)
    },
  })
}

export function useDeleteCreditProduct(companyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (productId: string) => {
      await creditsService.deleteProduct(companyId, productId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.credits.products.all(companyId),
      })
      invalidateEffectiveProducts(queryClient, companyId)
    },
  })
}

export function useRestoreCreditProduct(companyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (productId: string) => {
      const response = await creditsService.restoreProduct(companyId, productId)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.credits.products.all(companyId),
      })
      invalidateEffectiveProducts(queryClient, companyId)
    },
  })
}

export function useEffectiveProducts(
  companyId: string | undefined,
  params?: EffectiveProductListParams
) {
  return useQuery({
    queryKey: queryKeys.credits.effectiveProducts.list(companyId || '', params),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await creditsService.listEffectiveProducts(
        companyId,
        params
      )
      return normalizePaginated<EffectiveProduct>(response.data)
    },
    enabled: !!companyId,
  })
}

export function useCreditTopups(
  companyId: string | undefined,
  params?: CreditTopupListParams
) {
  return useQuery({
    queryKey: queryKeys.credits.topups.list(companyId || '', params),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await creditsService.listTopups(companyId, params)
      return normalizePaginated<CreditTopup>(response.data)
    },
    enabled: !!companyId,
  })
}

export function useCreditTopup(
  companyId: string | undefined,
  topupId: string | undefined,
  refetchInterval?: number | false
) {
  return useQuery({
    queryKey: queryKeys.credits.topups.detail(companyId || '', topupId || ''),
    queryFn: async () => {
      if (!companyId || !topupId) throw new Error('Topup ID is required')
      const response = await creditsService.getTopup(companyId, topupId)
      return response.data
    },
    enabled: !!companyId && !!topupId,
    refetchInterval,
  })
}

export function useCreateCreditTopup(companyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateCreditTopupPayload) => {
      const response = await creditsService.createTopup(companyId, payload)
      return response.data
    },
    onSuccess: () => {
      invalidateCredits(queryClient, companyId)
    },
  })
}

export function useUpdateCreditTopupStatus(companyId: string, topupId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateCreditTopupStatusPayload) => {
      const response = await creditsService.updateTopupStatus(
        companyId,
        topupId,
        payload
      )
      return response.data
    },
    onSuccess: () => {
      invalidateCredits(queryClient, companyId)
      queryClient.invalidateQueries({
        queryKey: queryKeys.credits.topups.detail(companyId, topupId),
      })
    },
  })
}

export function useCreditBalance(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.credits.balance(companyId || ''),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await creditsService.getBalance(companyId)
      return response.data
    },
    enabled: !!companyId,
  })
}

export function useCreditLedger(
  companyId: string | undefined,
  params?: CreditLedgerListParams
) {
  return useQuery({
    queryKey: queryKeys.credits.ledger.list(companyId || '', params),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await creditsService.listLedger(companyId, params)
      return normalizePaginated<CreditLedgerEntry>(response.data)
    },
    enabled: !!companyId,
  })
}
