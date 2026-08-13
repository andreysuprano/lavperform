import type {
  Audience,
  AudienceCriteriaMetadata,
  AudiencePreviewResponse,
  AudiencesListResponse,
  CreateAudienceRequest,
  UpdateAudienceRequest,
} from '@/types'

import { client } from './client'

export const audienceService = {
  async list(
    companyId: string,
    params: { page?: number; limit?: number } = {},
  ) {
    return client.get<AudiencesListResponse>(
      `/companies/${companyId}/audiences`,
      { params },
    )
  },

  async getById(companyId: string, audienceId: string) {
    return client.get<Audience>(`/companies/${companyId}/audiences/${audienceId}`)
  },

  async create(companyId: string, data: CreateAudienceRequest) {
    return client.post<Audience>(`/companies/${companyId}/audiences`, data)
  },

  async update(companyId: string, audienceId: string, data: UpdateAudienceRequest) {
    return client.patch<Audience>(
      `/companies/${companyId}/audiences/${audienceId}`,
      data,
    )
  },

  async remove(companyId: string, audienceId: string) {
    return client.delete(`/companies/${companyId}/audiences/${audienceId}`)
  },

  async preview(companyId: string, definition: CreateAudienceRequest['definition']) {
    return client.post<AudiencePreviewResponse>(
      `/companies/${companyId}/audiences/preview`,
      { definition },
    )
  },

  async getCriteria(companyId: string) {
    return client.get<AudienceCriteriaMetadata[]>(
      `/companies/${companyId}/audiences/metadata/criteria`,
    )
  },

  async getProducts(companyId: string, search?: string) {
    return client.get<{ data: string[] }>(
      `/companies/${companyId}/audiences/metadata/products`,
      { params: search ? { search } : undefined },
    )
  },

  async getNeighborhoods(companyId: string, search?: string) {
    return client.get<{ data: string[] }>(
      `/companies/${companyId}/audiences/metadata/neighborhoods`,
      { params: search ? { search } : undefined },
    )
  },

  async getCities(companyId: string, search?: string) {
    return client.get<{ data: string[] }>(
      `/companies/${companyId}/audiences/metadata/cities`,
      { params: search ? { search } : undefined },
    )
  },

  async getDdds(companyId: string, search?: string) {
    return client.get<{ data: string[] }>(
      `/companies/${companyId}/audiences/metadata/ddds`,
      { params: search ? { search } : undefined },
    )
  },
}
