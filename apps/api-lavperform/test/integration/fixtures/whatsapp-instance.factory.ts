import { PrismaClient, WhatsappInstance, WhatsappInstanceStatus } from '@prisma/client';
const { faker } = require('@faker-js/faker/locale/pt_BR');

export class WhatsappInstanceFactory {
  constructor(private prisma: PrismaClient) {}

  async create(
    companyId: string,
    overrides: Partial<WhatsappInstance> = {}
  ): Promise<WhatsappInstance> {
    return this.prisma.whatsappInstance.create({
      data: {
        name: overrides.name || faker.company.name().toLowerCase().replace(/[^a-z0-9]/g, '-'),
        status: overrides.status || WhatsappInstanceStatus.PENDING,
        token: overrides.token || faker.string.uuid(),
        phoneNumber: overrides.phoneNumber || faker.phone.number(),
        companyId,
        ...overrides,
      },
    });
  }
}
