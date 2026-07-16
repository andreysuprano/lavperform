import { IRepository } from '../../common/database/repository.interface';
import { Partner } from './partner.entity';

export interface IPartnerRepository extends IRepository<Partner> {
    findAllWithIntegrations(companyId: string): Promise<Partner[]>;
}
