import { randomUUID } from 'crypto';
import {
  AutomaticCampaignType,
  MessageStatus,
  PrismaClient,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { AutomaticMessageDailyGuardService } from 'src/automatic-campaign/application/automatic-message-daily-guard.service';
import { DatabaseCleaner } from '../utils/db-cleaner';

describe('AutomaticMessageDailyGuardService concurrency (Integration)', () => {
  let pool: Pool;
  let prisma: PrismaClient;
  let cleaner: DatabaseCleaner;
  let guard: AutomaticMessageDailyGuardService;

  beforeAll(() => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 4,
    });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    cleaner = new DatabaseCleaner(prisma);
    guard = new AutomaticMessageDailyGuardService(prisma as any);
  });

  afterEach(async () => {
    await cleaner.cleanAll();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it('allows exactly one worker for concurrent automatic messages with the same canonical phone', async () => {
    const company = await prisma.company.create({
      data: {
        name: 'Concorrência',
        cnpj: '12.345.678/0001-90',
        email: 'race@example.com',
        slug: 'daily-guard-race',
        state: 'ACTIVE',
      },
    });
    const [firstCustomer, secondCustomer] = await Promise.all([
      prisma.customer.create({
        data: {
          name: 'Primeiro',
          phone: '11 99999-9999',
          companyId: company.id,
        },
      }),
      prisma.customer.create({
        data: {
          name: 'Segundo',
          phone: '+55 (11) 99999-9999',
          companyId: company.id,
        },
      }),
    ]);
    const campaignId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "AutomaticCampaign"
        ("id", "name", "type", "companyId", "segmentation", "startDate",
         "endDate", "messageText", "createdAt", "updatedAt")
      VALUES
        (${campaignId}, ${'Campanha automática'},
         ${AutomaticCampaignType.ACQUISITION}::"AutomaticCampaignType",
         ${company.id}, ${'ALL'}, ${new Date('2026-09-01T03:00:00.000Z')},
         ${new Date('2026-09-30T02:59:59.999Z')}, ${'Olá'}, NOW(), NOW())
    `;
    const firstCreatedAt = new Date('2026-09-04T12:00:00.000Z');
    const secondCreatedAt = new Date('2026-09-04T12:00:00.001Z');
    const [firstMessage, secondMessage] = await Promise.all([
      prisma.message.create({
        data: {
          segmentation: 'ALL',
          status: MessageStatus.PROCESSING,
          messageText: 'Primeira',
          customerName: firstCustomer.name,
          phone: firstCustomer.phone!,
          customerId: firstCustomer.id,
          companyId: company.id,
          automaticCampaignId: campaignId,
          createdAt: firstCreatedAt,
        },
      }),
      prisma.message.create({
        data: {
          segmentation: 'ALL',
          status: MessageStatus.PROCESSING,
          messageText: 'Segunda',
          customerName: secondCustomer.name,
          phone: secondCustomer.phone!,
          customerId: secondCustomer.id,
          companyId: company.id,
          automaticCampaignId: campaignId,
          createdAt: secondCreatedAt,
        },
      }),
    ]);

    const results = await Promise.all([
      guard.claimForProcessing(firstMessage.id),
      guard.claimForProcessing(secondMessage.id),
    ]);

    expect(results.filter((result) => result.allowed)).toHaveLength(1);
    expect(results.filter((result) => !result.allowed)).toHaveLength(1);
    expect(results[0]).toEqual({ allowed: true });
    expect(results[1]).toEqual({
      allowed: false,
      blockerId: firstMessage.id,
    });

    const messages = await prisma.message.findMany({
      where: { id: { in: [firstMessage.id, secondMessage.id] } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, status: true },
    });
    expect(messages).toEqual([
      { id: firstMessage.id, status: MessageStatus.PROCESSING },
      { id: secondMessage.id, status: MessageStatus.ABORTED },
    ]);
  });
});
