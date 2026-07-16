import { IRepository } from '../../common/database/repository.interface';
import { CompanySubscription } from './company-subscription.entity';

export interface ICompanySubscriptionRepository extends IRepository<CompanySubscription> {
    findByCompanyId(companyId: string): Promise<CompanySubscription | null>;
}
