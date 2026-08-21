export type DashCustomersProps = {
  activeCustomers: number
  inactiveCustomers: number
  newCustomers: number
  totalCustomers: number
  achievableCustomers: number
  unattainableCustomers: number
  leads: number
}

export type CustomerInsightSegment = {
  segmentation: string
  count: number
  label: string
  icon: string
}

export type CustomerInsightsOpportunities = {
  retention: number
  reconquest: number
  loyalty: number
  nurture: number
  leads: number
  upcomingBirthdays: number
}

export type CustomerInsightsHealth = {
  activeRate: number
  inactiveRate: number
  reachabilityRate: number
  retentionRate: number
  reconquestRate: number
  loyaltyRate: number
}

export type CustomerInsightsPatterns = {
  averageTicket: number
  topOrderDays: Array<{ day: string; count: number }>
}

export type CustomerCampaignReadiness = {
  withEmail: number
  withBirthDate: number
  withPhone: number
  withWhatsappOptin: number
  withEmailRate: number
  withBirthDateRate: number
  withPhoneRate: number
  withWhatsappOptinRate: number
}

export type DashCustomersInsightsProps = {
  summary: DashCustomersProps
  segments: CustomerInsightSegment[]
  opportunities: CustomerInsightsOpportunities
  campaignReadiness: CustomerCampaignReadiness
  health: CustomerInsightsHealth
  patterns: CustomerInsightsPatterns
}

import type { CampaignMessageTypeBreakdown } from './campaign.types'

export type DashCampaignDailyPoint = {
  clicks: number
  day: string
  messages: number
  sales: number
  errors?: number
  salesAmount?: number
}

export type DashTopCampaign = {
  id: string
  name: string
  messagesSent: number
  interactions: number
  salesTotalQuantity: number
  salesTotalAmount: number
  totalCost: number
  ctr: number
  conversionRate: number
  roi: number | null
}

export type DashCampaignsProps = {
  activeCampaigns: {
    conversionRate: string | number
    messagesSent: number
    salesTotalAmount: string | number
    salesTotalQuantity: number
    totalCustomers: number
    totalCost: number
    messageTypeBreakdown: CampaignMessageTypeBreakdown[]
    interactions?: number
    messagesError?: number
    ctr?: number
    clickToSaleRate?: number
    averageTicket?: number
    errorRate?: number
  }
  messagesSentByDate: DashCampaignDailyPoint[]
  topCampaigns?: DashTopCampaign[]
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
  customerPhone: string | null
  customerEmail: string | null
  id: string
  productsLabel: string
  saleAmount: number
  saleDate: string
}
