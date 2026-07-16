export interface Coupon {
  id: string
  companyId: string
  code: string
  description: string | null
  type: string
  unit: string
  value: number
  validUntil: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CouponListParams {
  page?: number
  limit?: number
  orderBy?: string
  orderDirection?: "asc" | "desc"
  search?: string
  active?: boolean
  onlyValid?: boolean
}

export interface PaginatedCouponsResponse {
  data: Coupon[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
