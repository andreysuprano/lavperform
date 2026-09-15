/**
 * Tipos standalone do contrato da API aberta (POST /v1/orders).
 * Espelham os DTOs de `foodcrm-api/src/public-api/orders/application/dto`
 * sem as dependências do NestJS/class-validator.
 */

export interface IngestAddress {
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  zipCode?: string
}

export interface IngestCustomer {
  name: string
  phone?: string
  cpf?: string
  email?: string
  birthDate?: string
  gender?: 'M' | 'F' | 'Outro'
  address?: IngestAddress
}

export interface IngestOrderOption {
  optionId: number
  externalCode?: string
  name: string
  quantity: number
  unitPrice: number
  optionGroupId: number
  optionGroupName: string
}

export interface IngestOrderItem {
  itemId: number
  externalCode?: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  kind: 'item' | 'combo' | 'service'
  status: 'confirmed' | 'cancelled' | 'closed'
  observation?: string
  items?: IngestOrderItem[]
  options?: IngestOrderOption[]
}

export interface IngestOrderPayment {
  total: number
  paymentType: string
  status: 'paid' | 'pending' | 'refunded'
  paymentMethod: string
  changeFor?: number
  cardNumber?: string
  cardBrand?: string
  observation?: string
  paymentFee: number
}

export interface IngestOrderDiscount {
  type: string
  value: number
  description?: string
}

export interface IngestOrderDeliveryAddress {
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  zipCode?: string
  reference?: string
}

export interface IngestOrderSchedule {
  deliveryDateRaw: string
  deliveryTimeRaw: string
  deliveryAt?: string
}

export interface IngestOrderDto {
  externalOrderId: string
  displayId: number
  status:
    | 'closed'
    | 'cancelled'
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'ready'
    | 'delivered'
  orderType: 'delivery' | 'takeout' | 'dine_in' | 'indoor' | 'pickup'
  orderTiming: 'instant' | 'scheduled'
  salesChannel?: string
  partnerId?: string
  customerOrigin?: string
  merchantId?: number
  tableNumber?: string
  estimatedTime?: number
  cancellationReason?: string
  fiscalDocument?: string
  observation?: string
  deliveryFee: number
  serviceFee: number
  additionalFee: number
  total: number
  customer: IngestCustomer
  deliveryAddress?: IngestOrderDeliveryAddress
  schedule?: IngestOrderSchedule
  items?: IngestOrderItem[]
  payments?: IngestOrderPayment[]
  discounts?: IngestOrderDiscount[]
  createdAt: string
  updatedAt: string
}
