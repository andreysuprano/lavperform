import { PrismaClient, Customer } from '@prisma/client';
const { faker } = require('@faker-js/faker/locale/pt_BR');

export class CustomerFactory {
  constructor(private prisma: PrismaClient) {}

  async create(
    companyId: string,
    overrides: Partial<Customer> = {}
  ): Promise<Customer> {
    return this.prisma.customer.create({
      data: {
        name: overrides.name || faker.person.fullName(),
        phone: overrides.phone || faker.helpers.fromRegExp('+55119[0-9]{8}'),
        email: overrides.email || faker.internet.email(),
        birthDate: overrides.birthDate || faker.date.past({ years: 30 }),
        whatsappOptin: overrides.whatsappOptin ?? true,
        companyId,
        ...overrides,
      },
    });
  }

  async createMany(
    companyId: string,
    count: number,
    overrides: Partial<Customer> = {}
  ): Promise<Customer[]> {
    return Promise.all(
      Array.from({ length: count }, () => this.create(companyId, overrides))
    );
  }

  async createWithOrders(companyId: string, orderCount: number = 3) {
    const customer = await this.create(companyId);
    // Create associated orders
    // Implementation depends on OrderFactory
    return customer;
  }
}