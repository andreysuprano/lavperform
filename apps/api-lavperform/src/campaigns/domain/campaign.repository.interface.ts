import { IRepository } from '../../common/database/repository.interface';
import { Campaign } from './campaign.entity';
import { CampaignFilterDto } from 'src/campaigns/application/dto/campaign-filter.dto';

export interface ICampaignRepository extends IRepository<Campaign> {
    createWithMetric(data: Partial<Campaign>): Promise<Campaign>;
    findAllWithFilters(companyId: string, pagination: any, filter: CampaignFilterDto): Promise<{ items: Campaign[]; total: number }>;
    updateStatus(id: string, status: string): Promise<Campaign>;
}
