import type { PaginationMeta } from '@/types'

export type CompanyState = 'PENDING' | 'ACTIVE' | 'INACTIVE'

/** Empresa retornada pelo GET /application/preload (evita dados no token/JWT) */
export interface PreloadCompany {
  id: string
  name: string
  cnpj: string
  email: string
  phone: string
  avatarUrl: string
  address: CompanyAddress
  slug?: string
}

export interface ApplicationPreloadResponse {
  companies: PreloadCompany[]
}

export interface CompanyAddress {
  city: string
  complement?: string
  id: string
  neighborhood: string
  number: string
  state: string
  street: string
  zipCode: string
}

export interface Company {
  address: CompanyAddress
  avatarUrl: string
  cnpj: string
  email: string
  id: string
  name: string
  phone: string
  slug: string
  state: CompanyState
}

export interface AllCompaniesResponse {
  items: Company[]
  meta: PaginationMeta
}

export interface CompanyOnboarding {
  city: string
  complement?: string
  cnpj: string
  email?: string
  name: string
  neighborhood: string
  number: string
  phone: string
  state: string
  street: string
  zipCode: string
}

export interface Onboarding {
  businessPartnerId: string
  company: CompanyOnboarding
  email?: string
  name: string
  password: string
  phone: string
  planId: string
}

export interface CompanyOpeningHour {
  dayOfWeek: string
  openTime: string
  closeTime: string
  isOpen: boolean
}

export interface Plan {
  id: string
  name: string
  description: string
  price: string
  cycle: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'
  recommended: boolean
  maxPayments: 1 | 3 | 6 | 12
}

export interface BusinessPartner {
  id: string
  name: string
  email: string
  avatarUrl: string
}
