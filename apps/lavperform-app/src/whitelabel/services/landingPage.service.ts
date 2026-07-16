import { client } from '@/services/client'
import type {
  LandingPageConfig,
  LandingPageFormData,
  LandingPageData,
  PublicLandingPageResponse,
  UpdateLandingPagePayload,
} from '../types'

export const landingPageService = {
  /**
   * Busca a configuração da Landing Page para uma empresa
   */
  async getLandingPageConfig(companyId: string) {
    return await client.get<LandingPageConfig>(
      `/whitelabel/companies/${companyId}/landing-page/config`
    )
  },

  /**
   * Atualiza a configuração da Landing Page
   */
  async updateLandingPageConfig(
    companyId: string,
    data: Partial<LandingPageFormData>
  ) {
    return await client.patch<LandingPageConfig>(
      `/whitelabel/companies/${companyId}/landing-page/config`,
      data
    )
  },

  /**
   * Busca preview público da Landing Page (para renderização)
   */
  async getLandingPagePreview(companyId: string) {
    return await client.get<LandingPageData>(
      `/whitelabel/companies/${companyId}/landing-page/preview`
    )
  },

  /**
   * Busca a landing page pública da empresa (endpoint público)
   * Retorna dados completos incluindo slug, customDomain, etc.
   */
  async getPublicLandingPage(companyId: string) {
    return await client.get<PublicLandingPageResponse>(
      `/landing-page/company/${companyId}`
    )
  },

  /**
   * Atualiza a landing page pública da empresa (atualização parcial)
   * Suporta atualização de qualquer seção ou campos como active, customDomain
   */
  async updatePublicLandingPage(
    companyId: string,
    data: UpdateLandingPagePayload
  ) {
    return await client.patch<PublicLandingPageResponse>(
      `/landing-page/company/${companyId}`,
      data
    )
  },
}
