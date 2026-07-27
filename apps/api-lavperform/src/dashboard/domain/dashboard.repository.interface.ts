import { DailyMetricsEntity } from './daily-metrics.entity';
import { CampaignSummaryEntity, TopCampaignSummary } from './dashboard-summary.entity';
import { ResolvedDateRange } from '../../common/dto/date-range-filter.dto';

export interface IDashboardRepository {
  getCampaignsSummary(companyId: string, range: ResolvedDateRange): Promise<CampaignSummaryEntity>;
  getDailyMessageMetrics(companyId: string, range: ResolvedDateRange): Promise<DailyMetricsEntity[]>;
  getTopCampaigns(companyId: string, range: ResolvedDateRange, limit?: number): Promise<TopCampaignSummary[]>;
}
