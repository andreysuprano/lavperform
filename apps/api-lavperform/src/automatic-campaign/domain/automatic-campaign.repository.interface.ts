import { IRepository } from '../../common/database/repository.interface';
import { AutomaticCampaign } from './automatic-campaign.entity';
import { AutomaticCampaignFilterDto } from '../application/dto/automatic-campaign-filter.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ResolvedDateRange } from '../../common/dto/date-range-filter.dto';
import { ResolvedCampaignMessagesFilter } from '../application/dto/campaign-messages-filter.dto';

export interface IAutomaticCampaignRepository extends IRepository<AutomaticCampaign> {
    createWithRelations(data: Partial<AutomaticCampaign>, gifts?: any[], creatives?: any[]): Promise<AutomaticCampaign>;
    findAllWithFilters(companyId: string, pagination: PaginationDto, filter: AutomaticCampaignFilterDto): Promise<{ items: AutomaticCampaign[]; total: number }>;
    toggleActive(id: string, companyId: string): Promise<AutomaticCampaign>;
    softDelete(id: string): Promise<AutomaticCampaign>;
    restore(id: string): Promise<AutomaticCampaign>;
    getCampaignMetrics(campaignId: string, range: ResolvedDateRange): Promise<any>;
    getCampaignMessages(campaignId: string, filter: ResolvedCampaignMessagesFilter): Promise<{ data: any[]; meta: any }>;
}
