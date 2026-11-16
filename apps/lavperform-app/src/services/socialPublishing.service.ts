import axios from 'axios'

import type {
  ConnectionsOverview,
  ConnectStart,
  GoogleAssets,
  GoogleProfileView,
  MetaAssets,
  ScheduledPost,
  ScheduleSlot,
} from '@/types'

import { client } from './client'

export function publishingErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined
    if (Array.isArray(data?.message)) return data.message.join(' ')
    if (typeof data?.message === 'string' && data.message) return data.message
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export const socialPublishingService = {
  connections(companyId: string) {
    return client.get<ConnectionsOverview>(
      `/social-publishing/companies/${companyId}/connections`
    )
  },
  start(companyId: string, provider: string) {
    return client.post<ConnectStart>(
      `/social-publishing/companies/${companyId}/connections/${provider}/start`
    )
  },
  cancel(companyId: string, provider: string) {
    return client.post<ConnectionsOverview>(
      `/social-publishing/companies/${companyId}/connections/${provider}/cancel`
    )
  },
  disconnect(companyId: string, provider: string) {
    return client.delete<ConnectionsOverview>(
      `/social-publishing/companies/${companyId}/connections/${provider}`
    )
  },
  retry(companyId: string, provider: string) {
    return client.post<ConnectionsOverview>(
      `/social-publishing/companies/${companyId}/connections/${provider}/retry`
    )
  },
  metaAssets(companyId: string) {
    return client.get<MetaAssets>(
      `/social-publishing/companies/${companyId}/connections/meta/assets`
    )
  },
  googleAssets(companyId: string) {
    return client.get<GoogleAssets>(
      `/social-publishing/companies/${companyId}/connections/google/assets`
    )
  },
  selectMeta(
    companyId: string,
    body: { pageId: string; igUserId?: string; adAccountId?: string }
  ) {
    return client.post<ConnectionsOverview>(
      `/social-publishing/companies/${companyId}/connections/meta/selection`,
      body
    )
  },
  selectGoogle(
    companyId: string,
    body: { locationId: string; adCustomerId?: string }
  ) {
    return client.post<ConnectionsOverview>(
      `/social-publishing/companies/${companyId}/connections/google/selection`,
      body
    )
  },
  googleProfile(companyId: string) {
    return client.get<GoogleProfileView>(
      `/social-publishing/companies/${companyId}/google-business`
    )
  },
  replyReview(companyId: string, reviewId: string, comment: string) {
    return client.post(
      `/social-publishing/companies/${companyId}/google-business/reviews/${reviewId}/reply`,
      { comment }
    )
  },
  seed(companyId: string) {
    return client.post<ConnectionsOverview>(
      `/social-publishing/companies/${companyId}/sandbox/seed`
    )
  },
  suggestions() {
    return client.get<{ slots: ScheduleSlot[] }>('/social-publishing/suggestions')
  },
  posts(companyId: string, from: string, to: string) {
    return client.get<ScheduledPost[]>(
      `/social-publishing/companies/${companyId}/posts`,
      { params: { from, to } }
    )
  },
  createPost(body: Record<string, unknown>) {
    return client.post<ScheduledPost>('/social-publishing/posts', body)
  },
  updatePost(postId: string, body: Record<string, unknown>) {
    return client.patch<ScheduledPost>(`/social-publishing/posts/${postId}`, body)
  },
  cancelPost(postId: string) {
    return client.post<ScheduledPost>(`/social-publishing/posts/${postId}/cancel`)
  },
  retryPost(postId: string) {
    return client.post(`/social-publishing/posts/${postId}/retry`)
  },
}
