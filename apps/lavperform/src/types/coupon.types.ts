import type { PaginationMeta } from './common.types'

/**
 * Cupom da empresa (listagem, CRUD e campanhas).
 * Alinhado a POST/GET/PUT e listagem do backend.
 */
export type CreateCouponRequest = {
  code: string
  description: string
  type: string
  unit: string
  value: number
  validUntil: string
  active: boolean
}

export type UpdateCouponRequest = Partial<CreateCouponRequest>

export type CompanyCoupon = {
  id: string
  code: string
  description?: string
  type: string
  unit: string
  value: number
  validUntil?: string
  active: boolean
  createdAt?: string
  updatedAt?: string
  deletedAt?: string | null
}

export type CompanyCouponListResponse = {
  data: CompanyCoupon[]
  meta?: PaginationMeta
}
