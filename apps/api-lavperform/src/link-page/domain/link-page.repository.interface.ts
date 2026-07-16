import { IRepository } from '../../common/database/repository.interface';
import { LinkPage } from './link-page.entity';

export interface ILinkPageRepository extends IRepository<LinkPage> {
    findByCompanyId(companyId: string): Promise<LinkPage | null>;
    findByCompanyIdWithRelations(companyId: string): Promise<LinkPage | null>;
    updateByCompanyId(companyId: string, data: Partial<LinkPage>): Promise<void>;
}
