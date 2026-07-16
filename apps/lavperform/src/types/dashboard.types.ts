export type DashCustomersProps = {
  activeCustomers: number
  inactiveCustomers: number
  newCustomers: number
  totalCustomers: number
  achievableCustomers: number
  unattainableCustomers: number
  leads: number
}

export type DashCampaignsProps = {
  activeCampaigns: {
    conversionRate: string
    messagesSent: number
    salesTotalAmount: string
    salesTotalQuantity: number
    totalCustomers: number
  }
  messagesSentByDate: [
    {
      clicks: number
      day: string
      messages: number
      sales: number
    }
  ]
}

export type DashboardPerformanceSummary = {
  dailySalesAmount: number
  dailySalesCount: number
}

export type DashboardPerformanceChartPoint = {
  count: number
  label: string
  totalValue: number
}

export type DashboardPerformanceData = {
  chartData: DashboardPerformanceChartPoint[]
  summary: DashboardPerformanceSummary
}

export type DashboardRecentSale = {
  customerName: string
  id: string
  productsLabel: string
  saleAmount: number
  saleDate: string
}
