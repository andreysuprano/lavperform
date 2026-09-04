import { CustomerPrismaRepository } from 'src/customers/infrastructure/persistence/prisma-customer.repository';

describe('CustomerPrismaRepository', () => {
  const prisma = {
    customer: {
      findFirst: jest.fn(),
    },
    order: {
      groupBy: jest.fn().mockResolvedValue([]),
    },
  };
  const repository = new CustomerPrismaRepository(prisma as any);

  const older = {
    id: 'cust-old',
    name: 'Ana Antiga',
    phone: '5541997269435',
    email: null,
    cpf: '12345678900',
    birthDate: null,
    firstOrderDate: null,
    lastOrderDate: null,
    bestOrderDay: null,
    bestOrderHour: null,
    lastContactDate: null,
    rfvClassification: null,
    gender: null,
    observations: null,
    whatsappOptin: false,
    whatsappVerified: false,
    whatsappVerifiedAt: null,
    averageTicket: null,
    companyId: 'company-1',
    addressId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    address: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.order.groupBy.mockResolvedValue([]);
    prisma.customer.findFirst.mockResolvedValue(older);
  });

  it('findByPhone escolhe o cliente mais antigo por createdAt ASC, id ASC', async () => {
    const result = await repository.findByPhone('company-1', '5541997269435');

    expect(prisma.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'company-1', phone: '5541997269435' },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    );
    expect(result?.id).toBe('cust-old');
  });

  it('findByCpf escolhe o cliente mais antigo por createdAt ASC, id ASC', async () => {
    const result = await repository.findByCpf('company-1', '12345678900');

    expect(prisma.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'company-1', cpf: '12345678900' },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    );
    expect(result?.id).toBe('cust-old');
  });
});
