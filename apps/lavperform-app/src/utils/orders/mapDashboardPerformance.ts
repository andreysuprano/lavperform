import type {
  DashboardPerformanceData,
  DashboardRecentSale,
  MonthlySalesResponse,
  OrdersSalesResponse,
  PaginationMeta,
} from '@/types'

import { formatSaleProducts } from './formatSaleProducts'

export type RecentSalesData = {
  meta: PaginationMeta
  sales: DashboardRecentSale[]
}

export function mapMonthlySalesToPerformance(
  data: MonthlySalesResponse
): DashboardPerformanceData {
  return {
    summary: {
      dailySalesAmount: data.today.totalValue,
      dailySalesCount: data.today.count,
      dailyCycleCount: data.today.cycleCount,
    },
    chartData: data.series.map((point) => ({
      label: point.month,
      count: point.count,
      totalValue: point.totalValue,
    })),
  }
}

export function mapOrdersSalesToRecentSales(
  data: OrdersSalesResponse
): DashboardRecentSale[] {
  return data.sales.map((sale) => ({
    id: sale.orderId,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone ?? null,
    customerEmail: sale.customerEmail ?? null,
    productsLabel: formatSaleProducts(sale.products),
    saleAmount: sale.total,
    saleDate: sale.date,
  }))
}

export function mapSalesResponseToRecentSalesData(
  data: OrdersSalesResponse
): RecentSalesData {
  return {
    sales: mapOrdersSalesToRecentSales(data),
    meta: {
      total: data.total,
      page: data.page,
      limit: data.limit,
      totalPages: data.totalPages,
      hasNextPage: data.page < data.totalPages,
      hasPreviousPage: data.page > 1,
    },
  }
}
