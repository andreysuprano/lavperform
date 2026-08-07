import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { queryKeys } from '@/lib/react-query'
import { toaster } from '@/components/ui/toaster'
import { landingPageService } from '@/whitelabel/services'
import { getMockLandingPageConfig } from '@/whitelabel/utils'
import type {
  LandingPageConfig,
  LandingPageTemplate,
  UpdateLandingPagePayload,
} from '@/whitelabel/types'

function normalizeLandingPageTemplate(
  template?: string | null
): LandingPageTemplate {
  if (template === 'modern' || template === 'elegant' || template === 'default') {
    return template
  }
  return 'default'
}

/**
 * Hook para buscar configuração da Landing Page
 * Busca dados do backend via endpoint público e converte para formato esperado pelas páginas
 */
export function useLandingPageConfig() {
  const { selectedCompany } = useAuth()

  return useQuery({
    queryKey: queryKeys.whitelabel.landingPage.config(
      selectedCompany?.id || ''
    ),
    queryFn: async () => {
      if (!selectedCompany) {
        throw new Error('Company ID is required')
      }

      // Busca dados do backend via endpoint público
      const response = await landingPageService.getPublicLandingPage(
        selectedCompany.id
      )
      const publicData = response.data

      // Converte PublicLandingPageResponse para LandingPageConfig
      // (formato esperado pelas páginas)
      const config: LandingPageConfig = {
        id: publicData.id,
        companyId: publicData.companyId,
        template: normalizeLandingPageTemplate(publicData.template),
        data: {
          branding: publicData.branding,
          hero: publicData.hero,
          services: publicData.services,
          location: publicData.location,
          faq: publicData.faq,
          testimonials: publicData.testimonials,
          cta: publicData.cta,
          footer: publicData.footer,
          navigation: publicData.navigation,
        },
        createdAt: publicData.createdAt,
        updatedAt: publicData.updatedAt,
      }

      return config
    },
    enabled: !!selectedCompany,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para atualizar configuração da Landing Page (atualização parcial)
 * Suporta atualização de qualquer seção ou campos como active, customDomain
 */
export function useUpdateLandingPageConfig() {
  const { selectedCompany } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateLandingPagePayload) => {
      if (!selectedCompany) {
        throw new Error('Company ID is required')
      }

      const response = await landingPageService.updatePublicLandingPage(
        selectedCompany.id,
        data
      )
      return response.data
    },
    onSuccess: () => {
      if (selectedCompany) {
        // Invalida cache da configuração
        queryClient.invalidateQueries({
          queryKey: queryKeys.whitelabel.landingPage.config(
            selectedCompany.id
          ),
        })
        // Invalida cache da landing page pública
        queryClient.invalidateQueries({
          queryKey: queryKeys.whitelabel.landingPage.public(
            selectedCompany.id
          ),
        })
        // Invalida cache "existe landing page" (menu lateral)
        queryClient.invalidateQueries({
          queryKey: queryKeys.whitelabel.landingPage.exists(
            selectedCompany.id
          ),
        })
        // Invalida cache do preview
        queryClient.invalidateQueries({
          queryKey: queryKeys.whitelabel.landingPage.preview(
            selectedCompany.id
          ),
        })
      }
      toaster.create({
        title: 'Sucesso',
        description: 'Configuração da Landing Page atualizada com sucesso!',
        type: 'success',
      })
    },
    onError: () => {
      toaster.create({
        title: 'Erro',
        description: 'Não foi possível atualizar a configuração.',
        type: 'error',
      })
    },
  })
}

/**
 * Hook para buscar preview público da Landing Page
 * Por enquanto usa dados mockados (localStorage)
 * Quando o backend estiver disponível, substituir por chamada real
 */
export function useLandingPagePreview() {
  const { selectedCompany } = useAuth()

  return useQuery({
    queryKey: queryKeys.whitelabel.landingPage.preview(
      selectedCompany?.id || ''
    ),
    queryFn: async () => {
      if (!selectedCompany) {
        throw new Error('Company ID is required')
      }

      // TODO: Quando backend estiver disponível, descomentar:
      // const response = await landingPageService.getLandingPagePreview(selectedCompany.id)
      // return response.data

      // Por enquanto, usa dados mockados
      const config = getMockLandingPageConfig(selectedCompany.id)
      return config.data
    },
    enabled: !!selectedCompany,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para buscar landing page pública (sem autenticação)
 * Usado para renderizar a landing page pública da empresa
 * Retorna dados completos incluindo slug, customDomain, etc.
 */
export function usePublicLandingPage(companyId: string) {
  return useQuery({
    queryKey: queryKeys.whitelabel.landingPage.public(companyId),
    queryFn: async () => {
      if (!companyId) {
        throw new Error('Company ID is required')
      }

      const response = await landingPageService.getPublicLandingPage(companyId)
      return response.data
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook simplificado para saber se a empresa já tem landing page criada.
 * Usa query key própria (exists) para não colidir com usePublicLandingPage no cache.
 * Trata 404 como "não existe landing page" em vez de erro.
 */
export function useHasLandingPage() {
  const { selectedCompany } = useAuth()

  const query = useQuery({
    queryKey: queryKeys.whitelabel.landingPage.exists(
      selectedCompany?.id || ''
    ),
    queryFn: async () => {
      if (!selectedCompany) {
        throw new Error('Company ID is required')
      }

      try {
        await landingPageService.getPublicLandingPage(selectedCompany.id)
        return true
      } catch (error: any) {
        const status =
          error?.response?.status ??
          error?.status ??
          error?.code

        if (status === 404 || status === '404') {
          // Empresa sem landing page criada
          return false
        }

        throw error
      }
    },
    enabled: !!selectedCompany,
    staleTime: 1000 * 60 * 5,
  })

  return {
    ...query,
    hasLandingPage: query.data ?? false,
  }
}
