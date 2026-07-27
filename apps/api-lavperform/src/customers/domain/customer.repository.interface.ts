import { Order } from 'src/orders/domain/order.entity';
import { IRepository } from '../../common/database/repository.interface';
import { Customer } from './customer.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Message } from '@prisma/client';

export interface ICustomerRepository extends IRepository<Customer> {
    findByPhone(companyId: string, phone: string): Promise<Customer | null>;
    findByCpf(companyId: string, cpf: string): Promise<Customer | null>;
    count(options?: any): Promise<number>;
    countByCompany(companyId: string): Promise<number>;
    countByCompanyAndRfv(companyId: string, rfv: string[]): Promise<number>;
    countByCompanyAndWhatsappVerified(companyId: string, verified: boolean): Promise<number>;
    countLeadsByCompany(companyId: string): Promise<number>;
    totalCustomersBySegmentation(companyId: string): Promise<any[]>; // Using any[] for now to match service logic, can be refined
    createWithAddress(data: Partial<Customer>, addressData: any): Promise<Customer>;
    updateWithAddress(id: string, data: Partial<Customer>, addressData: any): Promise<Customer>;
    deleteWithAddress(id: string, addressId: string): Promise<Customer>;
    getLifeTimeValueByCustomer(customerId: string): Promise<number>;
    getTotalOrdersByCustomer(customerId: string): Promise<number>;
    getLastOrdersByCustomer(customerId: string): Promise<Order[]>;
    getLastMessagesSentToCustomer(customerId: string, pagination?: PaginationDto): Promise<{ data: Message[]; total: number; page: number; limit: number }>;
    findWhatsappValidationCandidates(companyId: string, skip: number, take: number): Promise<Array<{ id: string; phone: string; companyId: string }>>;
    getTopBuyers(
        companyId: string,
        options: {
            limit: number;
            sortBy: 'totalSpent' | 'orderCount';
            startDate?: Date;
            endDate?: Date;
        },
    ): Promise<
        Array<{
            customerId: string;
            name: string;
            phone: string | null;
            email: string | null;
            rfvClassification: string | null;
            averageTicket: number;
            lastOrderDate: Date | null;
            totalSpent: number;
            orderCount: number;
            companyId: string;
            whatsappOptin: boolean;
            createdAt: Date;
            updatedAt: Date;
            birthDate: Date | null;
        }>
    >;
}
