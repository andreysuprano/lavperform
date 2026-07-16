import { PrismaClient, Campaign, CampaignStatus } from '@prisma/client';
const { faker } = require('@faker-js/faker/locale/pt_BR');

export class CampaignFactory {
  constructor(private prisma: PrismaClient) {}

  async create(
    companyId: string,
    overrides: Partial<Campaign> = {}
  ): Promise<Campaign> {
    const scheduledDate = overrides.scheduledDate || faker.date.future();

    return this.prisma.campaign.create({
      data: {
        name: overrides.name || faker.commerce.productName(),
        scheduledDate,
        messageText: overrides.messageText || faker.lorem.paragraph(),
        segmentation: overrides.segmentation || 'ALL',
        imageUrl: overrides.imageUrl || faker.image.url(),
        status: overrides.status || CampaignStatus.WAITING,
        modifiedByAI: overrides.modifiedByAI ?? false,
        companyId,
        ...overrides,
      },
    });
  }

  async createMany(
    companyId: string,
    count: number,
    overrides: Partial<Campaign> = {}
  ): Promise<Campaign[]> {
    return Promise.all(
      Array.from({ length: count }, () => this.create(companyId, overrides))
    );
  }

  async createWithStatus(
    companyId: string,
    status: CampaignStatus
  ): Promise<Campaign> {
    return this.create(companyId, { status });
  }
}