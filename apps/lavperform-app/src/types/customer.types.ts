import { ClientTypes } from '@/utils/constants/clientType'

import type { PaginationMeta } from './common.types'

export interface CustomerAddress {
  id?: string
  street?: string | null
  number?: string | null
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  email?: string | null
  cpf?: string | null
  birthDate: string | null
  firstOrderDate?: string | null
  lastOrderDate?: string | null
  bestOrderDay?: string | null
  bestOrderHour?: string | null
  lastContactDate?: string | null
  rfvClassification: string
  gender?: string | null
  observations?: string | null
  whatsappOptin: boolean
  whatsappVerified?: boolean
  whatsappVerifiedAt?: string | null
  avatarUrl?: string | null
  averageTicket: string | number
  companyId: string
  addressId?: string | null
  createdAt: string
  updatedAt: string
  address?: CustomerAddress | null
  origin?: string | null
}

export interface CustomerResponse {
  items: Customer[]
  meta: PaginationMeta
}

export interface TopBuyerCustomer {
  customerId: string
  name: string
  phone: string | null
  email: string | null
  rfvClassification: string | null
  averageTicket: number
  lastOrderDate: string | null
  totalSpent: number
  orderCount: number
  companyId: string
  whatsappOptin: boolean
  createdAt: string
  updatedAt: string
  birthDate: string | null
}

export interface TopBuyersResponse {
  items: TopBuyerCustomer[]
}

export interface CustomerFormData {
  name: string
  phone: string
  email?: string
  birthDate?: string
  whatsappOptin?: boolean
}

export interface CustomerOrderItemOption {
  id: string
  name: string
  quantity: number
  unitPrice: string
}

export interface CustomerOrderItem {
  id: string
  name: string
  quantity: number
  unitPrice: string
  totalPrice: string
  options: CustomerOrderItemOption[]
}

export interface CustomerOrderPayment {
  id: string
  orderId: string
  total: string
  paymentType: string
  status: string
  paymentMethod: string
  paymentFee: string
}

export interface CustomerOrder {
  id: string
  name: string
  deliveryFee: string
  total: string
  createdAt: string
  items: CustomerOrderItem[]
  payments: CustomerOrderPayment[]
}

export interface CustomerImport {
  name: string | null
  phone: string | null
  email: string | null
  birthDate: string | null
  firstOrderDate: string | null
  rfvClassification: ClientTypes | null
  gender: string | null
  observations: string | null
  whatsappOptin: boolean
  averageTicket: number | null
  address: {
    street: string | null
    number: string | null
    complement: string | undefined
    neighborhood: string | null
    city: string | null
    state: string | null
    zipCode: string | null
  }
}

// ==================== CustomerDetailsModal Types ====================

/**
 * Desconto aplicado em um pedido
 */
export interface OrderDiscount {
  id?: string
  name?: string
  value?: number
  type?: string
  [key: string]: unknown
}

/**
 * Pedido completo retornado pela API de comportamento
 */
export interface CustomerBehaviorOrder {
  id: string
  integratorOrderId: string | null
  displayId: number
  merchantId: number
  status: string
  orderType: string // "delivery", "takeout", "dine_in", etc.
  orderTiming: string
  salesChannel: string // "catalog", "ifood", "digital_menu", etc.
  customerOrigin: string | null
  tableNumber: string | null
  estimatedTime: number | null
  cancellationReason: string | null
  fiscalDocument: string | null
  observation: string | null
  deliveryFee: number
  serviceFee: number
  additionalFee: number
  total: number
  createdAt: string
  updatedAt: string
  companyId: string
  customerId: string
  items: unknown[]
  discounts: OrderDiscount[]
  payments: unknown[]
  description: string
  orderOrigin?: {
    name: string
    logoUrl: string
  }
}

/**
 * Dados comportamentais do cliente para análise RFV e métricas
 */
export interface CustomerBehavior {
  lifeTimeValue: number
  totalOrders: number
  averageTicket: number
  lastOrders: CustomerBehaviorOrder[]
}

/**
 * Resumo de mensagens enviadas ao cliente
 */
export interface CustomerMessages {
  total: number
  byWhatsApp: number
  lastMessage: string
}

/**
 * Item de mensagem retornado pela API
 */
export interface CustomerMessageApiItem {
  id: string
  attempts: number
  segmentation: string
  token: string
  error: string | null
  status: 'SENT' | 'PROCESSING' | 'DELIVERED' | 'READ' | 'FAILED' | 'ERROR' | 'ABORTED'
  messageText: string
  mediaUrl: string | null
  customerName: string
  phone: string
  customerId: string
  companyId: string
  automaticCampaignId: string | null
  campaignId: string | null
  scheduledDate: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Resposta paginada de mensagens do cliente
 */
export interface CustomerMessageResponse {
  data: CustomerMessageApiItem[]
  total: number
  page: number
  limit: number
}

/**
 * Detalhes de uma mensagem individual enviada ao cliente
 */
export interface CustomerMessageDetail {
  id: string
  content: string
  platform: 'whatsapp' | 'ifood' | 'cardapio_digital' | 'sms' | 'email'
  platformName: string // "WhatsApp", "iFood", "Cardápio Digital", etc.
  sentAt: string // ISO date
  status: 'sent' | 'processing' | 'delivered' | 'read' | 'failed'
  statusLabel: string // "Enviada", "Processando", "Entregue", "Lida", "Falhou"
  mediaUrl?: string | null
  phone?: string
}

/**
 * Evento na linha do tempo do cliente
 */
export interface CustomerHistoryEvent {
  type: 'purchase' | 'repurchase' | 'coupon'
  title: string
  value?: number
  discount?: string
  channel?: string
  campaign?: string
  timeAgo: string
  iconType: 'bag' | 'coupon'
}

/**
 * Segmento ao qual o cliente pertence
 */
export interface CustomerSegment {
  segment: string
  status: 'Ativo' | 'Inativo'
  origin: string
}

/**
 * Pedido simplificado para exibição na tab de comportamento
 */
export interface CustomerOrderSummary {
  id: string
  date: string
  description: string
  value: number
  coupon?: string
  status?: string
  orderType?: string
  salesChannel?: string
  origin?: string
}

// ==================== Customer Metrics Types ====================

/**
 * Métricas gerais da base de clientes
 */
export interface CustomerMetrics {
  totalCustomers: number
  activeCustomers: number
  inactiveCustomers: number
  newCustomers: number
  newCustomersPeriodDays: number
  achievableCustomers: number
  unattainableCustomers: number
  leads: number
}

export interface CustomerMetricsResponse {
  data: CustomerMetrics
}

// ==================== WhatsApp Import Types ====================

/**
 * Cliente retornado pela API do WhatsApp para importação
 */
export interface WhatsAppCustomer {
  id: string
  name: string
  phone: string
  email?: string | null
  whatsappOptin: boolean
  whatsappVerified?: boolean
  /**
   * Indica se o cliente está ativo e pode ser importado
   * Cliente ativo = whatsappOptin: true AND telefone válido (pelo menos 10 dígitos)
   */
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

/**
 * Resposta paginada de clientes do WhatsApp
 */
export interface WhatsAppCustomersResponse {
  data: WhatsAppCustomer[]
  total: number
  page: number
  limit: number
}

/**
 * Requisição para importar clientes do WhatsApp
 */
export interface ImportWhatsAppCustomersRequest {
  customerIds: string[]
}

// ==================== RFV Matrix Types ====================

/**
 * Dados de um segmento RFV individual
 */
export interface RfvSegmentData {
  count: number
  percentage: number
}

/**
 * Resposta da API com dados de todos os segmentos RFV
 */
export interface RfvMatrixData {
  campeao: RfvSegmentData
  fiel: RfvSegmentData
  em_potencial: RfvSegmentData
  novo: RfvSegmentData
  promissor: RfvSegmentData
  precisa_de_atencao: RfvSegmentData
  quase_dormente: RfvSegmentData
  nao_posso_perder: RfvSegmentData
  em_risco: RfvSegmentData
  hibernando: RfvSegmentData
  perdido: RfvSegmentData
  lead: RfvSegmentData
}

/**
 * Mapeamento de um segmento no grid RFV
 */
export interface RfvSegmentPosition {
  key: keyof RfvMatrixData
  label: string
  gridRow: number
  gridColumn: number
  gridColumnEnd?: number
  gridRowEnd?: number
  description?: string
}