import type {
  AllCompaniesResponse,
  BusinessPartner,
  Company,
  CompanyOpeningHour,
  CompanyState,
  Onboarding,
  Plan,
} from '@/types'

import { client } from './client'

export const companyService = {
  async getAllCompanies(data?: { page?: number; limit?: number }) {
    return await client.get<AllCompaniesResponse>('/companies', {
      params: data,
    })
  },

  async createOnboarding(payload: Onboarding) {
    return await client.post('/onboarding', payload)
  },

  async getCompany(companyId: string) {
    return await client.get<Company>(`/companies/${companyId}`)
  },

  async updateCompany(companyId: string, data: Partial<Company>) {
    return await client.patch(`/companies/${companyId}`, data)
  },

  async updateCompanyState(companyId: string, state: CompanyState) {
    return await client.patch(`/companies/${companyId}/state/${state}`)
  },

  async updateCompanyAvatar(companyId: string, avatarUrl: string) {
    return await client.patch(`/companies/${companyId}/avatar`, {
      avatar: avatarUrl,
    })
  },
}

export const scheduleService = {
  async getOpeningHours(companyId: string) {
    return await client.get<CompanyOpeningHour[]>(
      `/companies/${companyId}/opening-hours`
    )
  },

  async saveOpeningHours(
    companyId: string,
    payload: { openingHours: CompanyOpeningHour[] }
  ) {
    return await client.put(`/companies/${companyId}/opening-hours`, payload)
  },
}

export const selfOnboardingService = {
  async getAllPlans() {
    return await client.get<Plan[]>('/onboarding/plans')
  },

  async getPartner(id: string) {
    return await client.get<BusinessPartner>(
      `/onboarding/business-partner/${id}`
    )
  },
}
