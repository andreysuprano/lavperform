import { faker } from '@faker-js/faker';
import { PrismaClient, Company, CompanyStatus } from '@prisma/client';

export class CompanyFactory {
  constructor(private prisma: PrismaClient) {}

  async create(overrides: Partial<Company> = {}): Promise<Company> {
    return this.prisma.company.create({
      data: {
        name: overrides.name || faker.company.name(),
        cnpj: overrides.cnpj || this.generateCNPJ(),
        email: overrides.email || faker.internet.email(),
        state: overrides.state || CompanyStatus.ACTIVE,
        phone: overrides.phone || faker.phone.number({ style: 'national' }),
        ...overrides,
      },
    });
  }

  async createMany(count: number, overrides: Partial<Company> = {}): Promise<Company[]> {
    return Promise.all(
      Array.from({ length: count }, () => this.create(overrides))
    );
  }

  async createWithStatus(status: CompanyStatus): Promise<Company> {
    return this.create({ state: status });
  }

  private generateCNPJ(): string {
    const random = () => Math.floor(Math.random() * 10);
    return `${random()}${random()}.${random()}${random()}${random()}.${random()}${random()}${random()}/${random()}${random()}${random()}${random()}-${random()}${random()}`;
  }
}
