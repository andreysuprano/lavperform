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

  it('waits for a held advisory lock and only completes after its release', async () => {
    const company = await prisma.company.create({
      data: {
        name: 'Lock explícito',
        cnpj: '98.765.432/0001-10',
        email: 'held-lock@example.com',
        slug: 'daily-guard-held-lock',
        state: 'ACTIVE',
      },
    });
    const customer = await prisma.customer.create({
      data: {
        name: 'Cliente bloqueado',
        phone: '11 98888-7777',
        companyId: company.id,
      },
    });
    const campaignId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "AutomaticCampaign"
        ("id", "name", "type", "companyId", "segmentation", "startDate",
         "endDate", "messageText", "createdAt", "updatedAt")
      VALUES
        (${campaignId}, ${'Campanha lock'},
         ${AutomaticCampaignType.ACQUISITION}::"AutomaticCampaignType",
         ${company.id}, ${'ALL'}, ${new Date('2026-09-01T03:00:00.000Z')},
         ${new Date('2026-09-30T02:59:59.999Z')}, ${'Olá'}, NOW(), NOW())
    `;
    const message = await prisma.message.create({
      data: {
        segmentation: 'ALL',
        status: MessageStatus.PROCESSING,
        messageText: 'Mensagem',
        customerName: customer.name,
        phone: customer.phone!,
        customerId: customer.id,
        companyId: company.id,
        automaticCampaignId: campaignId,
        createdAt: new Date('2026-09-04T12:00:00.000Z'),
      },
    });
    const lockKey = `${company.id}:2026-09-04:customer:${customer.id}`;

    const events: string[] = [];
    let claimRequested!: () => void;
    const claimWasRequested = new Promise<void>((resolve) => {
      claimRequested = resolve;
    });
    let holderAcquired!: () => void;
    const acquired = new Promise<void>((resolve) => {
      holderAcquired = resolve;
    });
    const holder = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`
          SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))::text AS lock
        `;
        events.push('holder-acquired');
        holderAcquired();
        await claimWasRequested;
        await tx.$queryRaw`SELECT pg_sleep(1.5)::text AS barrier`;
        events.push('holder-release');
      },
      { maxWait: 5_000, timeout: 10_000 },
    );
    await acquired;

    let advisoryCalls = 0;
    const instrumentedPrisma = {
      $transaction: (callback: (tx: unknown) => unknown, options: unknown) =>
        prisma.$transaction(async (tx) => {
          const instrumentedTx = new Proxy(tx as object, {
            get(target, property, receiver) {
              const value = Reflect.get(target, property, receiver);
              if (property === '$queryRaw') {
                return async (...args: unknown[]) => {
                  const isHeldKey = advisoryCalls === 0;
                  advisoryCalls += 1;
                  if (isHeldKey) {
                    events.push('claim-lock-requested');
                    claimRequested();
                  }
                  const result = await value.apply(target, args);
                  if (isHeldKey) {
                    events.push('claim-lock-acquired');
                  }
                  return result;
                };
              }
              return typeof value === 'function' ? value.bind(target) : value;
            },
          });
          return callback(instrumentedTx);
        }, options as any),
    };
    const instrumentedGuard = new AutomaticMessageDailyGuardService(
      instrumentedPrisma as any,
    );
    const claim = instrumentedGuard
      .claimForProcessing(message.id)
      .then((result) => {
        events.push('claim-settled');
        return result;
      });

    await expect(claim).resolves.toEqual({ allowed: true });
    await holder;
    expect(events).toEqual([
      'holder-acquired',
      'claim-lock-requested',
      'holder-release',
      'claim-lock-acquired',
      'claim-settled',
    ]);
  });
});
