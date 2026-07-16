import { faker } from '@faker-js/faker';
import { PrismaClient, Order } from '@prisma/client';

export class OrderFactory {
  constructor(private prisma: PrismaClient) {}

  async create(
    companyId: string,
    customerId: string,
    overrides: Partial<Order> = {}
  ): Promise<Order> {
    return this.prisma.order.create({
      data: {
        companyId,
        customerId,
        totalAmount: overrides.totalAmount || parseFloat(faker.commerce.price({ min: 10, max: 500 })),
        status: overrides.status || 'PENDING',
        ...overrides,
      },
    });
  }

  async createMany(
    companyId: string,
    customerId: string,
    count: number,
    overrides: Partial<Order> = {}
  ): Promise<Order[]> {
    return Promise.all(
      Array.from({ length: count }, () => this.create(companyId, customerId, overrides))
    );
  }

  async createCompleted(
    companyId: string,
    customerId: string,
    amount?: number
  ): Promise<Order> {
    return this.create(companyId, customerId, {
      status: 'COMPLETED',
      totalAmount: amount,
    });
  }

  async createCancelled(
    companyId: string,
    customerId: string
  ): Promise<Order> {
    return this.create(companyId, customerId, {
      status: 'CANCELLED',
    });
  }
}
