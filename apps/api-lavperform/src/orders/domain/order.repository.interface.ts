import { IRepository } from '../../common/database/repository.interface';
import { Order } from './order.entity';
import { OrderFilterDto } from 'src/orders/application/dto/order-filter.dto';
import { MonthlySalesItemDto } from '../application/dto/monthly-sales-history.dto';

export interface IOrderRepository extends IRepository<Order> {
    createWithRelations(data: any): Promise<Order>; // Specific create for complex order structure
    findByIntegratorOrderId(companyId: string, integratorOrderId: number): Promise<Order | null>;
    findByExternalOrderId(companyId: string, externalOrderId: string): Promise<Order | null>;
    findByCustomerId(customerId: string, options?: OrderFilterDto): Promise<{ items: Order[]; total: number }>;
    findByCompanyId(companyId: string, options?: OrderFilterDto): Promise<{ items: Order[]; total: number }>;
    count(options?: any): Promise<number>;
    getTotalOrdersValueByCustomer(customerId: string): Promise<number | string>;
    getMonthlySalesHistory(companyId: string): Promise<MonthlySalesItemDto[]>;
    getTodaySales(companyId: string): Promise<{ count: number; totalValue: number }>;
}
