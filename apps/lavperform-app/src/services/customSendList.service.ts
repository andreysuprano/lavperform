import type {
  CreateCustomSendListRequest,
  CustomSendList,
  CustomSendListMemberIdsResponse,
  CustomSendListsListResponse,
  EligibleCountResponse,
  ReplaceCustomSendListMembersRequest,
  UpdateCustomSendListRequest,
} from '@/types'

import { client } from './client'

export const customSendListService = {
  list(companyId: string, params: { page?: number; limit?: number } = {}) {
    return client.get<CustomSendListsListResponse>(
      `/companies/${companyId}/custom-send-lists`,
      { params },
    )
  },

  getById(
    companyId: string,
    listId: string,
    params: { page?: number; limit?: number } = {},
  ) {
    return client.get<CustomSendList>(
      `/companies/${companyId}/custom-send-lists/${listId}`,
      { params },
    )
  },

  getMemberIds(companyId: string, listId: string) {
    return client.get<CustomSendListMemberIdsResponse>(
      `/companies/${companyId}/custom-send-lists/${listId}/member-ids`,
    )
  },

  create(companyId: string, data: CreateCustomSendListRequest) {
    return client.post<CustomSendList>(
      `/companies/${companyId}/custom-send-lists`,
      data,
    )
  },

  update(companyId: string, listId: string, data: UpdateCustomSendListRequest) {
    return client.patch<CustomSendList>(
      `/companies/${companyId}/custom-send-lists/${listId}`,
      data,
    )
  },

  replaceMembers(
    companyId: string,
    listId: string,
    data: ReplaceCustomSendListMembersRequest,
  ) {
    return client.put<{ memberCount: number }>(
      `/companies/${companyId}/custom-send-lists/${listId}/members`,
      data,
    )
  },

  remove(companyId: string, listId: string) {
    return client.delete(`/companies/${companyId}/custom-send-lists/${listId}`)
  },

  getEligibleCount(
    companyId: string,
    listId: string,
    channel?: string,
  ) {
    return client.get<EligibleCountResponse>(
      `/companies/${companyId}/custom-send-lists/${listId}/eligible-count`,
      { params: channel ? { channel } : undefined },
    )
  },
}
