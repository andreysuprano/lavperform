import { faker } from '@faker-js/faker';
import { PrismaClient, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export class UserFactory {
  constructor(private prisma: PrismaClient) {}

  async create(overrides: Partial<User> = {}): Promise<User> {
    const password = overrides.password || 'Test123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: {
        name: overrides.name || faker.person.fullName(),
        email: overrides.email || faker.internet.email(),
        phone: overrides.phone || faker.phone.number('+55119########'),
        password: hashedPassword,
        ...overrides,
      },
    });
  }

  async createWithCompany(
    companyId: string,
    overrides: Partial<User> = {}
  ): Promise<User> {
    const password = overrides.password || 'Test123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: {
        name: overrides.name || faker.person.fullName(),
        email: overrides.email || faker.internet.email(),
        phone: overrides.phone || faker.phone.number('+55119########'),
        password: hashedPassword,
        userCompanies: {
          create: {
            companyId,
          },
        },
        ...overrides,
      },
    });
  }

  async createMany(count: number, overrides: Partial<User> = {}): Promise<User[]> {
    return Promise.all(
      Array.from({ length: count }, () => this.create(overrides))
    );
  }
}
