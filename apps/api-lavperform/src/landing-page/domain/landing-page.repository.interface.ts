import { IRepository } from '../../common/database/repository.interface';
import { LandingPage } from './landing-page.entity';

export interface ILandingPageRepository extends IRepository<LandingPage> {
    findBySlug(slug: string): Promise<LandingPage | null>;
    findByCompanyId(companyId: string): Promise<LandingPage[]>;
    findActiveBySlug(slug: string): Promise<LandingPage | null>;
    findByCustomDomain(customDomain: string): Promise<LandingPage | null>;
    findActiveByCustomDomain(customDomain: string): Promise<LandingPage | null>;
}
