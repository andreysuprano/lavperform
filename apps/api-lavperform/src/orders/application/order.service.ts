import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { SalesSummaryResponseDto } from './dto/sales-summary.dto';
import { MonthlySalesHistoryResponseDto } from './dto/monthly-sales-history.dto';
import { IOrderRepository } from '../domain/order.repository.interface';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @Inject('IOrderRepository')
    private readonly orderRepository: IOrderRepository,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async create(orderData: CreateOrderDto) {
    const order = await this.orderRepository.createWithRelations(orderData);

    try {
      this.eventEmitter.emit('order.created', {
        orderId: order.id,
        customerId: order.customerId,
        companyId: order.companyId,
      });
    } catch (error) {
      this.logger.error(`Erro ao emitir evento order.created para cliente ${order.customerId}:`, error);
    }

    return order;
  }

  async findByIntegratorOrderId(companyId: string, integratorOrderId: number) {
    return await this.orderRepository.findByIntegratorOrderId(companyId, integratorOrderId);
  }

  async findByExternalOrderId(companyId: string, externalOrderId: string) {
    return await this.orderRepository.findByExternalOrderId(companyId, externalOrderId);
  }

  async findByCustomerId(customerId: string, filterDto?: OrderFilterDto): Promise<OrderResponseDto> {
    const { page = 1, limit = 10 } = filterDto || {};

    const { items, total } = await this.orderRepository.findByCustomerId(customerId, filterDto);

    return {
      orders: items as any[], // Casting to match DTO structure which might expect specific shape
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByCompanyId(companyId: string, filterDto?: OrderFilterDto): Promise<OrderResponseDto> {
    const { page = 1, limit = 10 } = filterDto || {};

    const { items, total } = await this.orderRepository.findByCompanyId(companyId, filterDto);

    return {
      orders: items as any[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTotalOrdersValueByCustomer(customerId: string) {
    return await this.orderRepository.getTotalOrdersValueByCustomer(customerId);
  }

  async findMonthlySalesHistory(companyId: string): Promise<MonthlySalesHistoryResponseDto> {
    const [series, today] = await Promise.all([
      this.orderRepository.getMonthlySalesHistory(companyId),
      this.orderRepository.getTodaySales(companyId),
    ]);
    return { today, series };
  }

  async findSalesSummary(companyId: string, filterDto?: OrderFilterDto): Promise<SalesSummaryResponseDto> {
    const { page = 1, limit = 10 } = filterDto || {};

    const { items, total } = await this.orderRepository.findByCompanyId(companyId, filterDto);

    const sales = items.map(order => ({
      orderId: order.id,
      date: order.createdAt,
      total: order.total,
      products: order.items
        .filter(item => !item.parentItemId)
        .map(item => ({ name: item.name, quantity: item.quantity })),
      customerName: order.customer?.name ?? 'Desconhecido',
      customerPhone: order.customer?.phone ?? null,
      customerEmail: order.customer?.email ?? null,
    }));

    return {
      sales,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}