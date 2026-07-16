import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { toaster } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { queryKeys } from '@/lib/react-query'
import { openApiService } from '@/services'
import type { ApiKeyRotateResponse, ApiKeyWithSecret } from '@/types'

function mapRotateResponseToActiveKey(
  data: ApiKeyRotateResponse
): ApiKeyWithSecret {
  return {
    id: data.id,
    name: data.name,
    prefix: data.prefix,
    status: data.status,
    expiresAt: data.expiresAt,
    lastUsedAt: null,
    revokedAt: null,
    createdAt: data.createdAt,
    updatedAt: data.createdAt,
    secret: data.secret,
  }
}

export function useOpenApiKey(
  companyId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.company.apiKeys.active(companyId || ''),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')

      try {
        const response = await openApiService.getActiveApiKey(companyId)
        return response.data
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } })?.response
          ?.status
        if (status === 404) {
          return null
        }
        throw error
      }
    },
    enabled: !!companyId && (options?.enabled ?? true),
    staleTime: 1000 * 30,
    retry: false,
  })
}

export function useRegenerateOpenApiKey() {
  const queryClient = useQueryClient()
  const { selectedCompany } = useAuth()

  return useMutation({
    mutationFn: async () => {
      if (!selectedCompany?.id) {
        throw new Error('Company ID is required')
      }
      const response = await openApiService.rotateApiKey(selectedCompany.id)
      return response.data
    },
    onSuccess: async (data) => {
      if (!selectedCompany?.id) return

      const activeKey = mapRotateResponseToActiveKey(data)
      queryClient.setQueryData(
        queryKeys.company.apiKeys.active(selectedCompany.id),
        activeKey
      )

      await queryClient.invalidateQueries({
        queryKey: queryKeys.company.apiKeys.active(selectedCompany.id),
      })

      toaster.create({
        title: 'Sucesso',
        description: 'Novo token gerado com sucesso.',
        type: 'success',
      })
    },
    onError: () => {
      toaster.create({
        title: 'Erro',
        description: 'Não foi possível gerar um novo token.',
        type: 'error',
      })
    },
  })
}
