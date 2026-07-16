import { RenitencyConfiguration } from './renitency-configuration.entity';

export interface IRenitencyConfigurationRepository {
    create(data: Partial<RenitencyConfiguration>): Promise<RenitencyConfiguration>;
    findByCompanyId(companyId: string): Promise<RenitencyConfiguration | null>;
    update(id: string, data: Partial<RenitencyConfiguration>): Promise<RenitencyConfiguration>;
}
