import type {
  IncentivizedSalesParams,
  IncentivizedSalesResponse,
  MonthlySalesResponse,
  OrdersSalesParams,
  OrdersSalesResponse,
} from '@/types'

import { client } from './client'

export const ordersService = {
  async getMonthlySales(companyId: string) {
    return await client.get<MonthlySalesResponse>(
      `/companies/${companyId}/orders/monthly-sales`
    )
  },

  async getSales(companyId: string, params: OrdersSalesParams = {}) {
    return await client.get<OrdersSalesResponse>(
      `/companies/${companyId}/orders/sales`,
      { params }
    )
  },

  async getIncentivizedSales(
    companyId: string,
    params: IncentivizedSalesParams = {}
  ) {
    return await client.get<IncentivizedSalesResponse>(
      `/sale-attribution/incentivized-sales/${companyId}`,
      { params }
    )
  },
}
