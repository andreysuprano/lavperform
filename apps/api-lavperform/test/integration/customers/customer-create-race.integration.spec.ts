import { INestApplication, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { TestApp } from '../utils/test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { CompanyFactory } from '../fixtures/company.factory';
import { CustomersService } from 'src/customers/application/customers.service';
import { CustomerIdentityService } from 'src/customers/application/customer-identity.service';

describe('Customer create race (Integration)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let prisma: PrismaClient;
  let dbCleaner: DatabaseCleaner;
  let companyFactory: CompanyFactory;

  beforeAll(async () => {
    testApp = new TestApp();
    app = await testApp.setup();
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    dbCleaner = new DatabaseCleaner(prisma);
    companyFactory = new CompanyFactory(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await testApp.teardown();
  });

  afterEach(async () => {
    await dbCleaner.cleanAll();
  });

  it('rejects the second create with the same phone instead of inserting twice', async () => {
    const company = await companyFactory.create();
    const customers = app.get(CustomersService);
    const dto = {
      name: 'Camila Gabriela Rocha Santos',
      phone: '19993120772',
      cpf: '487.370.178-37',
    };

    const results = await Promise.allSettled([
      customers.create(company.id, dto),
      customers.create(company.id, dto),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(BadRequestException);

    const count = await prisma.customer.count({ where: { companyId: company.id } });
    expect(count).toBe(1);
  });

  it('lets resolveForSale reuse one customer when two sales race', async () => {
    const company = await companyFactory.create();
    const identity = app.get(CustomerIdentityService);
    const incoming = {
      name: 'Camila Gabriela Rocha Santos',
      phone: '19993120772',
      cpf: '48737017837',
    };

    const [first, second] = await Promise.all([
      identity.resolveForSale({ companyId: company.id, incoming }),
      identity.resolveForSale({ companyId: company.id, incoming }),
    ]);

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first?.id).toBe(second?.id);
    const count = await prisma.customer.count({ where: { companyId: company.id } });
    expect(count).toBe(1);
  });

  it('allows two anonymous customers without phone or cpf', async () => {
    const company = await companyFactory.create();
    const customers = app.get(CustomersService);
    await Promise.all([
      customers.create(company.id, { name: 'Anon 1' } as never),
      customers.create(company.id, { name: 'Anon 2' } as never),
    ]);
    const count = await prisma.customer.count({ where: { companyId: company.id } });
    expect(count).toBe(2);
  });

  it('persists empty phone and cpf as null and does not lock them together', async () => {
    const company = await companyFactory.create();
    const customers = app.get(CustomersService);
    const created = await customers.create(company.id, {
      name: 'Sem id',
      phone: '   ',
      cpf: '',
    } as never);
    expect(created.phone).toBeNull();
    expect(created.cpf).toBeNull();
  });

  it('locks cpf-placeholder phones as the literal phone value', async () => {
    const company = await companyFactory.create();
    const customers = app.get(CustomersService);
    const dto = { name: 'Sem tel', phone: 'cpf:48737017837' };
    const results = await Promise.allSettled([
      customers.create(company.id, dto as never),
      customers.create(company.id, dto as never),
    ]);
    const count = await prisma.customer.count({ where: { companyId: company.id } });
    expect(count).toBe(1);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });
});
