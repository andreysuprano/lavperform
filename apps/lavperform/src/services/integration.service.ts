import type { CompanyIntegration, CompanyIntegrationArgs } from '@/types'

import { client } from './client'

export const integrationService = {
  async getCompanyIntegration(companyId: string) {
    return await client.get<CompanyIntegration[]>(
      `/onboarding/partner/${companyId}`
    )
  },
  async saveUpdateCompanyIntegration({
    companyId,
    payload,
  }: CompanyIntegrationArgs) {
    return await client.post(
      `/onboarding/digital-menu-integration/${companyId}`,
      payload
    )
  },
}
