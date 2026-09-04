export type OrdersTodaySummary = {
  count: number
  totalValue: number
  cycleCount: number
}

export type MonthlySalesPoint = {
  month: string
  count: number
  totalValue: number
}

export type MonthlySalesResponse = {
  today: OrdersTodaySummary
  series: MonthlySalesPoint[]
}

export type OrderSaleProduct = {
  name: string
  quantity: number
}

export type OrderSale = {
  orderId: string
  date: string
  total: number
  products: OrderSaleProduct[]
  customerName: string
  customerPhone: string | null
  customerEmail: string | null
}

export type OrdersSalesParams = {
  page?: number
  limit?: number
  startDate?: string
  endDate?: string
  period?: 'today'
}

export type OrdersSalesResponse = {
  sales: OrderSale[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type IncentivizedSalesParams = {
  startDate?: string
  endDate?: string
}

export type IncentivizedSalesResponse = {
  totalValue: number
  totalCount: number
}
