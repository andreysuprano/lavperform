import { IRepository } from '../../common/database/repository.interface';
import { DigitalMenuIntegration } from './digital-menu-integration.entity';

export interface IDigitalMenuIntegrationRepository extends IRepository<DigitalMenuIntegration> {
    findByCompanyId(companyId: string): Promise<DigitalMenuIntegration | null>;
    findAllByCompanyId(companyId: string): Promise<DigitalMenuIntegration[]>;
    findByCompanyAndPartner(companyId: string, partnerId: string): Promise<DigitalMenuIntegration | null>;
}
