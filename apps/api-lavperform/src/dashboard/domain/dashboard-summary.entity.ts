export class DashboardSummaryEntity {
  constructor(
    public readonly totalCustomers: number,
    public readonly activeCustomers: number,
    public readonly inactiveCustomers: number,
    public readonly newCustomers: number,
  ) {}
}

export type CampaignMessageTypeBreakdown = {
  channel: string;
  category: string | null;
  count: number;
  cost: number;
};

export class CampaignSummaryEntity {
  constructor(
    public readonly messagesSent: number,
    public readonly conversionRate: number,
    public readonly salesTotalQuantity: number,
    public readonly salesTotalAmount: number,
    public readonly totalCustomers: number,
    public readonly totalCost: number = 0,
    public readonly messageTypeBreakdown: CampaignMessageTypeBreakdown[] = [],
  ) {}
}
