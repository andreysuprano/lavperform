import { PrismaClient, AutomaticCampaign, AutomaticCampaignType } from '@prisma/client';
const { faker } = require('@faker-js/faker/locale/pt_BR');

export class AutomaticCampaignFactory {
  constructor(private prisma: PrismaClient) {}

  async create(
    companyId: string,
    overrides: Partial<AutomaticCampaign> = {}
  ): Promise<AutomaticCampaign> {
    const startDate = overrides.startDate || new Date();
    const endDate = overrides.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return this.prisma.automaticCampaign.create({
      data: {
        name: overrides.name || faker.commerce.productName(),
        type: overrides.type || AutomaticCampaignType.SALES,
        segmentation: overrides.segmentation || 'ALL',
        active: overrides.active ?? true,
        startDate,
        endDate,
        messageText: overrides.messageText || faker.lorem.paragraph(),
        daysOfWeek: overrides.daysOfWeek || ['seg', 'ter', 'qua', 'qui', 'sex'],
        companyId,
        ...overrides,
      },
    });
  }

  async createMany(
    companyId: string,
    count: number,
    overrides: Partial<AutomaticCampaign> = {}
  ): Promise<AutomaticCampaign[]> {
    return Promise.all(
      Array.from({ length: count }, () => this.create(companyId, overrides))
    );
  }

  async createWithType(
    companyId: string,
    type: AutomaticCampaignType
  ): Promise<AutomaticCampaign> {
    return this.create(companyId, { type });
  }

  async createInactive(companyId: string): Promise<AutomaticCampaign> {
    return this.create(companyId, { active: false });
  }
}