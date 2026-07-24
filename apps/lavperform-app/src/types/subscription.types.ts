import { PaginationMeta } from './common.types'

export interface Subscription {
  internal: {
    id: string
    companyId: string
    subscriptionId: string
    planId: string
    createdAt: string
    updatedAt: string
    plan: {
      id: string
      name: string
      description: string
      price: string
      allowBoleto?: boolean
      allowPix?: boolean
      createdAt: string
      updatedAt: string
    }
  }
  asaas: {
    object: string
    id: string
    dateCreated: string
    customer: string
    paymentLink: string | null
    value: number
    nextDueDate: string
    cycle: string
    description: string
    billingType: string
    deleted: boolean
    status: 'ATIVO' | 'PENDENTE' | 'ATRASADO' | 'CANCELADO' | string
    externalReference: string
    checkoutSession: any | null
    creditCard: {
      creditCardNumber: string
      creditCardBrand: string
    } | null
    endDate: string | null
    maxPayments: number
    sendPaymentByPostalService: boolean
    fine: { value: number; type: string }
    interest: { value: number; type: string }
    split: any | null
  }
}

export interface SubscriptionResponse {
  data: {
    items: Subscription[]
    meta: PaginationMeta
  }
}

export interface Payment {
  object: string
  id: string
  dateCreated: string
  customer: string
  subscription: string
  value: number
  netValue: number
  description: string
  billingType: string
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'CANCELED' | string
  dueDate: string
  invoiceUrl: string
  invoiceNumber: string
  creditCard: {
    creditCardNumber: string
    creditCardBrand: string
  } | null
  bankSlipUrl: string | null
}

export interface PaymentDetails {
  barcode?: {
    identificationField: string
    nossoNumero: string
    barCode: string
  }
  pixQrCode?: {
    success: boolean
    encodedImage: string
    payload: string
    expirationDate: string
    description: string
  }
}

export interface PaymentResponse {
  object: string
  hasMore: boolean
  totalCount: number
  limit: number
  offset: number
  data: Payment[]
}
