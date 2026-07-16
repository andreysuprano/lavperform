import { IRepository } from '../../common/database/repository.interface';
import { RfvConfiguration } from './rfv-configuration.entity';

export interface IRfvConfigurationRepository extends IRepository<RfvConfiguration> {
    findByCompanyId(companyId: string): Promise<RfvConfiguration | null>;
    findAllActiveForRecalculation(): Promise<RfvConfiguration[]>;
}
