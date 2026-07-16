import { IRepository } from '../../common/database/repository.interface';
import { Company } from './company.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CompanyStatus } from '@prisma/client';

export interface ICompanyRepository extends IRepository<Company> {
    findByCnpj(cnpj: string): Promise<Company | null>;
    findBySlug(slug: string): Promise<Company | null>;
    createWithAddress(companyData: Partial<Company>, addressData: any): Promise<Company>;
    findAllWithFilters(pagination: PaginationDto): Promise<{ items: Company[]; total: number }>;
    findByIdWithRelations(id: string, relations?: string[]): Promise<Company | null>;
    updateState(id: string, state: CompanyStatus): Promise<Company>;
    updateAvatar(id: string, avatarUrl: string): Promise<Company>;
    findOpeningHours(id: string): Promise<any[]>;
    saveOpeningHours(id: string, openingHours: any[]): Promise<void>;
    updateOpeningHours(id: string, openingHours: any[]): Promise<void>;
    listCompanyUsers(id: string): Promise<any[]>;
    // Specialized queries for Integrations and Subscriptions could be here or in separate Repositories.
    // Given the service complexity, we might keep some direct prisma access in service for integrations temporarily or add specific methods here.
    findWithSubscriptions(id: string): Promise<Company | null>;
    findWithLinksAndMenu(slug: string): Promise<any>;
    deleteAddress(addressId: string): Promise<void>;
    softDelete(id: string): Promise<void>;
}
