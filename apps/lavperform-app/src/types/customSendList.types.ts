export type CustomSendListMember = {
  id: string
  name: string
  phone?: string | null
}

export interface CustomSendList {
  id: string
  companyId: string
  name: string
  description?: string | null
  memberCount?: number
  members?: CustomSendListMember[]
  membersMeta?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  createdAt: string
  updatedAt: string
}

export interface CreateCustomSendListRequest {
  name: string
  description?: string
  customerIds: string[]
}

export interface UpdateCustomSendListRequest {
  name?: string
  description?: string
}

export interface ReplaceCustomSendListMembersRequest {
  customerIds: string[]
}

export interface CustomSendListsListResponse {
  data: CustomSendList[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface EligibleCountResponse {
  count: number
}

export interface CustomSendListMemberIdsResponse {
  customerIds: string[]
}
