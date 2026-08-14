import { Customer as PrismaCustomer } from '@prisma/client';
import { CustomerMapper } from 'src/customers/infrastructure/persistence/mappers/customer.mapper';

const basePrismaCustomer = {
  id: 'cust-1',
  name: 'Ana',
  phone: '5511999999999',
  email: null,
  cpf: null,
  birthDate: null,
  firstOrderDate: null,
  lastOrderDate: null,
  bestOrderDay: null,
  bestOrderHour: null,
  lastContactDate: null,
  rfvClassification: 'campeao',
  gender: null,
  observations: null,
  whatsappOptin: true,
  averageTicket: 0,
  companyId: 'comp-1',
  whatsappVerified: false,
  whatsappVerifiedAt: null,
  avatarUrl: null,
  addressId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
} as unknown as PrismaCustomer;

describe('CustomerMapper', () => {
  it('hydrates first and last order dates from order stats when customer columns are empty', () => {
    const firstOrder = new Date('2025-03-01T12:00:00.000Z');
    const lastOrder = new Date('2026-08-10T12:00:00.000Z');

    const customer = CustomerMapper.toDomain(basePrismaCustomer, {
      _min: { createdAt: firstOrder },
      _max: { createdAt: lastOrder },
      _count: { _all: 4 },
    });

    expect(customer.firstOrderDate).toEqual(firstOrder);
    expect(customer.lastOrderDate).toEqual(lastOrder);
    expect(customer.orderCount).toBe(4);
  });

  it('keeps persisted order dates when they already exist', () => {
    const persistedFirst = new Date('2024-06-01T00:00:00.000Z');
    const persistedLast = new Date('2024-07-01T00:00:00.000Z');
    const fromOrdersFirst = new Date('2025-01-01T00:00:00.000Z');
    const fromOrdersLast = new Date('2025-02-01T00:00:00.000Z');

    const customer = CustomerMapper.toDomain(
      {
        ...basePrismaCustomer,
        firstOrderDate: persistedFirst,
        lastOrderDate: persistedLast,
      } as PrismaCustomer,
      {
        _min: { createdAt: fromOrdersFirst },
        _max: { createdAt: fromOrdersLast },
        _count: { _all: 2 },
      },
    );

    expect(customer.firstOrderDate).toEqual(persistedFirst);
    expect(customer.lastOrderDate).toEqual(persistedLast);
    expect(customer.orderCount).toBe(2);
  });

  it('marks customers without orders as having zero orderCount', () => {
    const customer = CustomerMapper.toDomain(basePrismaCustomer);

    expect(customer.firstOrderDate).toBeNull();
    expect(customer.lastOrderDate).toBeNull();
    expect(customer.orderCount).toBe(0);
  });
});
