import type { CompanyCoupon, CompanyCouponListResponse, CreateCouponRequest, UpdateCouponRequest } from '@/types'

import { client } from './client'

type ListResponse = CompanyCoupon[] | CompanyCouponListResponse

const base = (companyId: string) => `/coupons/${companyId}`

export const couponService = {
  async listCoupons(
    companyId: string,
    params?: { active?: boolean; page?: number; limit?: number }
  ) {
    return client.get<ListResponse>(base(companyId), { params })
  },

  async getCoupon(companyId: string, couponId: string) {
    return client.get<CompanyCoupon>(`${base(companyId)}/${couponId}`)
  },

  async createCoupon(companyId: string, body: CreateCouponRequest) {
    return client.post<CompanyCoupon>(base(companyId), body)
  },

  async updateCoupon(
    companyId: string,
    couponId: string,
    body: UpdateCouponRequest
  ) {
    return client.put<CompanyCoupon>(`${base(companyId)}/${couponId}`, body)
  },

  async deleteCoupon(companyId: string, couponId: string) {
    return client.delete<unknown>(`${base(companyId)}/${couponId}`)
  },

  async toggleCouponActive(companyId: string, couponId: string) {
    return client.put<CompanyCoupon>(
      `${base(companyId)}/${couponId}/toggle-active`
    )
  },

  async restoreCoupon(companyId: string, couponId: string) {
    return client.put<CompanyCoupon>(`${base(companyId)}/${couponId}/restore`)
  },
}
