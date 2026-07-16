export interface Partner {
  id: string
  name: string
  email: string
  phone: string
  cnpj: string
  avatarUrl: string
  createdAt?: string
  updatedAt?: string
}

export interface CreatePartner {
  name: string
  email: string
  phone: string
  cnpj: string
  avatarUrl: string
}

export interface UpdatePartner {
  name?: string
  email?: string
  phone?: string
  cnpj?: string
  avatarUrl?: string
}

export interface PartnerResponse {
  data: Partner[]
  total: number
  page: number
  limit: number
}
