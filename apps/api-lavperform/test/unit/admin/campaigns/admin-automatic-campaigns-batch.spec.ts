import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { AutomaticCampaignSendMode } from '@prisma/client';
import { AdminAutomaticCampaignsService } from 'src/admin/campaigns/admin-automatic-campaigns.service';
import { AutomaticCampaignService } from 'src/automatic-campaign/application/automatic-campaign.service';
import { AutomaticCampaignBatchService } from 'src/automatic-campaign/application/automatic-campaign-batch.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';

describe('AdminAutomaticCampaignsService batch save', () => {
  const prisma: any = {
    automaticCampaign: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn().mockResolvedValue({}),
    },
    gift: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    campaignMetric: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    message: { findMany: jest.fn().mockResolvedValue([]) },
    automaticCampaignCreative: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
  };
  const batch = {
    syncAfterSave: jest.fn().mockResolvedValue(undefined),
  };
  const queue = { add: jest.fn().mockResolvedValue(undefined) };
  let service: AdminAutomaticCampaignsService;

  const existing = {
    id: 'ac1',
    companyId: 'comp1',
    sendMode: AutomaticCampaignSendMode.CONTINUOUS,
    segmentation: 'campeao',
    targetingMode: 'RFV',
    audienceId: null,
    customSendListId: null,
    channel: 'WHATSAPP_WEB',
    status: 'IN_PROGRESS',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    batch.syncAfterSave.mockResolvedValue(undefined);
    prisma.message.findMany.mockResolvedValue([]);
    prisma.automaticCampaign.delete.mockResolvedValue({});
    const module = await Test.createTestingModule({
      providers: [
        AdminAutomaticCampaignsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AutomaticCampaignService, useValue: {} },
        { provide: AutomaticCampaignBatchService, useValue: batch },
        { provide: getQueueToken(QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE), useValue: queue },
      ],
    }).compile();
    service = module.get(AdminAutomaticCampaignsService);
  });

  it('keeps a cover-batch campaign when syncing the batch resolves', async () => {
    prisma.automaticCampaign.create.mockResolvedValue({
      id: 'ac1',
      status: 'PROCESSING',
      channel: 'WHATSAPP_WEB',
      companyId: 'comp1',
    });
    prisma.automaticCampaign.findUnique.mockResolvedValue({ id: 'ac1' });

    await expect(
      service.create({
        companyId: 'comp1',
        name: 'Campanha',
        type: 'REACTIVATION',
        segmentation: 'campeao',
        startDate: '2024-01-01',
        messageText: 'oi',
        channel: 'WHATSAPP_WEB',
      } as any),
    ).resolves.toEqual({ id: 'ac1' });

    expect(batch.syncAfterSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ac1',
        sendMode: AutomaticCampaignSendMode.COVER_BATCH,
      }),
    );
    expect(prisma.automaticCampaign.create.mock.invocationCallOrder[0]).toBeLessThan(
      batch.syncAfterSave.mock.invocationCallOrder[0],
    );
    expect(prisma.automaticCampaign.delete).not.toHaveBeenCalled();
  });

  it('deletes the created campaign when the continuous batch clear fails', async () => {
    prisma.automaticCampaign.create.mockResolvedValue({
      id: 'ac1',
      status: 'PROCESSING',
      channel: 'WHATSAPP_WEB',
      companyId: 'comp1',
    });
    batch.syncAfterSave.mockRejectedValueOnce(new Error('clear failed'));

    await expect(
      service.create({
        companyId: 'comp1',
        name: 'Campanha',
        type: 'REACTIVATION',
        segmentation: 'campeao',
        startDate: '2024-01-01',
        messageText: 'oi',
        channel: 'WHATSAPP_WEB',
        sendMode: AutomaticCampaignSendMode.CONTINUOUS,
      } as any),
    ).rejects.toThrow('clear failed');

    expect(prisma.automaticCampaign.delete).toHaveBeenCalledWith({ where: { id: 'ac1' } });
  });

  it('updates a cover-batch campaign after the row is saved', async () => {
    prisma.automaticCampaign.findUnique.mockResolvedValue(existing);
    prisma.automaticCampaign.update.mockResolvedValue(existing);

    await service.update('ac1', {
      sendMode: AutomaticCampaignSendMode.COVER_BATCH,
    } as any);

    expect(prisma.automaticCampaign.update.mock.invocationCallOrder[0]).toBeLessThan(
      batch.syncAfterSave.mock.invocationCallOrder[0],
    );
    expect(batch.syncAfterSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ac1',
        sendMode: AutomaticCampaignSendMode.COVER_BATCH,
      }),
    );
  });

  it('rejects an update when clearing the continuous batch fails after the row was saved', async () => {
    prisma.automaticCampaign.findUnique.mockResolvedValue({
      ...existing,
      sendMode: AutomaticCampaignSendMode.COVER_BATCH,
    });
    prisma.automaticCampaign.update.mockResolvedValue(existing);
    batch.syncAfterSave.mockRejectedValueOnce(new Error('clear failed'));

    await expect(
      service.update('ac1', { sendMode: AutomaticCampaignSendMode.CONTINUOUS } as any),
    ).rejects.toThrow('clear failed');

    expect(prisma.automaticCampaign.update).toHaveBeenCalled();
  });
});
