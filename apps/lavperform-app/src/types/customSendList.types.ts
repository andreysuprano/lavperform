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

export interface UpdateCustomSendListMembersRequest {
  addCustomerIds: string[]
  removeCustomerIds: string[]
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

export interface ImportCustomSendListCustomer {
  name: string
  phone: string
  email?: string
  birthDate?: string
  firstOrderDate?: string
  rfvClassification?: string
  gender?: string
  observations?: string
  whatsappOptin?: boolean
  averageTicket?: number
  address?: {
    street?: string
    number?: string
    complement?: string
    neighborhood?: string
    city?: string
    state?: string
    zipCode?: string
  }
}

export interface ImportCustomSendListCustomersRequest {
  customers: ImportCustomSendListCustomer[]
  replaceCustomerIds?: string[]
}

export interface ImportCustomSendListCustomersResponse {
  queued: number
  rejected: number
}
