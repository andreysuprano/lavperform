import { IRepository } from '../../common/database/repository.interface';
import { BusinessPartner } from './business-partner.entity';

export interface IBusinessPartnerRepository extends IRepository<BusinessPartner> {
    /**
     * Finds a business partner by ID
     */
    findById(id: string): Promise<BusinessPartner | null>;

    /**
     * Finds a business partner by email
     */
    findByEmail(email: string): Promise<BusinessPartner | null>;

    /**
     * Finds all business partners
     */
    findAll(): Promise<BusinessPartner[]>;

    /**
     * Creates a new business partner
     */
    create(data: Partial<BusinessPartner>): Promise<BusinessPartner>;

    /**
     * Updates a business partner
     */
    update(id: string, data: Partial<BusinessPartner>): Promise<BusinessPartner>;
}
