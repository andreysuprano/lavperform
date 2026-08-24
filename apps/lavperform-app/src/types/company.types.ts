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
  showIncentivizedSales?: boolean
  showTodayPurchases?: boolean
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
  showIncentivizedSales?: boolean
  showTodayPurchases?: boolean
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

export interface OnboardingCreditCard {
  holderName: string
  number: string
  expiryMonth: string
  expiryYear: string
  ccv: string
}

export interface OnboardingCreditCardHolderInfo {
  name: string
  email: string
  cpfCnpj: string
  postalCode: string
  addressNumber: string
  phone: string
}

export interface OnboardingWithPayment {
  businessPartnerId?: string
  company: CompanyOnboarding
  name: string
  email: string
  password: string
  phone: string
  planId?: string
  creditCard: OnboardingCreditCard
  creditCardHolderInfo: OnboardingCreditCardHolderInfo
}

export interface OnboardingWithPaymentResponse {
  accountActivated: boolean
  message?: string
  payment?: {
    id?: string
    status?: string
    invoiceUrl?: string | null
    value?: number
  } | null
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
  allowBoleto?: boolean
  allowPix?: boolean
}

export interface BusinessPartner {
  id: string
  name: string
  email: string
  avatarUrl: string
}
