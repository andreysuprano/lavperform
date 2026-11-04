import axios from 'axios'

import type {
  BrandIdentity,
  CreateDraftPayload,
  PostVariation,
  SaveBrandPayload,
  SocialDraftSummary,
  SocialPostDraft,
  UpdateVariationPayload,
} from '@/types'

import { client } from './client'

export const socialPostsService = {
  async getBrand(companyId: string) {
    return client.get<BrandIdentity>(`/social-posts/brand/${companyId}`)
  },

  async saveBrand(companyId: string, payload: SaveBrandPayload) {
    return client.put<BrandIdentity>(
      `/social-posts/brand/${companyId}`,
      payload
    )
  },

  async listDrafts(companyId: string) {
    return client.get<SocialDraftSummary[]>(`/social-posts/drafts/${companyId}`)
  },

  async createDraft(payload: CreateDraftPayload) {
    return client.post<SocialPostDraft>('/social-posts/drafts', payload)
  },

  async getDraft(draftId: string) {
    return client.get<SocialPostDraft>(`/social-posts/drafts/item/${draftId}`)
  },

  async generate(draftId: string) {
    return client.post<SocialPostDraft>(
      `/social-posts/drafts/item/${draftId}/generate`
    )
  },

  async generateMore(draftId: string) {
    return client.post<SocialPostDraft>(
      `/social-posts/drafts/item/${draftId}/more`
    )
  },

  async selectVariation(draftId: string, variationId: string) {
    return client.patch<SocialPostDraft>(
      `/social-posts/drafts/item/${draftId}/selection`,
      { variationId }
    )
  },

  async updateVariation(variationId: string, payload: UpdateVariationPayload) {
    return client.patch<PostVariation>(
      `/social-posts/variations/${variationId}`,
      payload
    )
  },

  async regenerateBackground(variationId: string, slideIndex = 0) {
    return client.post<PostVariation>(
      `/social-posts/variations/${variationId}/background`,
      { slideIndex }
    )
  },

  async rewriteCaption(variationId: string, length: string) {
    return client.post<PostVariation>(
      `/social-posts/variations/${variationId}/rewrite`,
      { length }
    )
  },

  async revise(variationId: string, prompt: string) {
    return client.post<SocialPostDraft>(
      `/social-posts/variations/${variationId}/revise`,
      { prompt }
    )
  },

  async restoreVersion(variationId: string, versionId: string) {
    return client.post<SocialPostDraft>(
      `/social-posts/variations/${variationId}/restore`,
      { versionId }
    )
  },

  async selectVersion(variationId: string, versionId: string) {
    return client.patch<SocialPostDraft>(
      `/social-posts/variations/${variationId}/version`,
      { versionId }
    )
  },

  async recordManual(variationId: string, payload: UpdateVariationPayload) {
    return client.post<SocialPostDraft>(
      `/social-posts/variations/${variationId}/manual`,
      payload
    )
  },
}

export function apiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: unknown } | undefined)
      ?.message
    if (Array.isArray(message)) return message.join(' ')
    if (typeof message === 'string') return message
  }
  return fallback
}
