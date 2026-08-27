import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AutomaticCampaignService } from 'src/automatic-campaign/application/automatic-campaign.service';
import { Test, TestingModule } from '@nestjs/testing';
import { IAutomaticCampaignRepository } from 'src/automatic-campaign/domain/automatic-campaign.repository.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { getQueueToken } from '@nestjs/bull';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';
import { MetaTemplatesService } from 'src/integrations/meta/application/meta-templates.service';
import { CustomSendListsService } from 'src/custom-send-lists/application/custom-send-lists.service';
import { MessageStatus } from '@prisma/client';
import { CAMPAIGN_PAUSED_ABORT_ERROR } from 'src/automatic-campaign/automatic-campaign.constants';

describe('AutomaticCampaignService', () => {
  let service: AutomaticCampaignService;
  let repository: IAutomaticCampaignRepository;

  const mockRepository = {
    createWithRelations: jest.fn(),
    findAllWithFilters: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    toggleActive: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
    getCampaignMetrics: jest.fn(),
    getCampaignMessages: jest.fn(),
  };

  const mockPrisma = {
    message: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      aggregate: jest.fn().mockResolvedValue({
        _min: { createdAt: new Date('2024-01-01T10:00:00.000Z') },
        _max: { createdAt: new Date('2024-01-03T10:00:00.000Z') },
      }),
    },
    automaticCampaign: {
      update: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn(async (fn) => fn(mockPrisma)),
    coupon: { findFirst: jest.fn() },
  };

  const mockQueue = { add: jest.fn().mockResolvedValue(undefined) };

  const mockMetaTemplatesService = {
    createFromCreative: jest.fn(),
    findAllByCompany: jest.fn(),
    archiveTemplatesByCreativeIds: jest.fn().mockResolvedValue(undefined),
    findTemplatesByCreativeIdsOrdered: jest.fn().mockResolvedValue([]),
    reconcileTemplatesForCampaign: jest.fn().mockResolvedValue([]),
    syncStatus: jest.fn(),
  };

  const mockCustomSendListsService = {
    assertCustomSendListBelongsToCompany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomaticCampaignService,
        {
          provide: 'IAutomaticCampaignRepository',
          useValue: mockRepository,
        },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken(QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE), useValue: mockQueue },
        { provide: MetaTemplatesService, useValue: mockMetaTemplatesService },
        {
          provide: CustomSendListsService,
          useValue: mockCustomSendListsService,
        },
      ],
    }).compile();

    service = module.get<AutomaticCampaignService>(AutomaticCampaignService);
    repository = module.get<IAutomaticCampaignRepository>('IAutomaticCampaignRepository');

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates campaign using repository and forwards creatives', async () => {
      mockRepository.createWithRelations.mockResolvedValue({ id: 'ac1' });
      const creatives = [{ imageUrls: ['x.jpg'], title: 't', message: 'm' }];

      const result = await service.create('comp1', {
        name: 'Auto',
        type: 'BIRTHDAY',
        segmentation: 'campeao',
        startDate: '2024-01-01',
        endDate: '2024-02-01',
        gifts: [{ name: 'Gift', value: 10 }],
        creatives,
      } as any);

      expect(repository.createWithRelations).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'comp1',
          maxDailySends: 50,
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          couponId: null,
        }),
        [{ name: 'Gift', value: 10 }],
        creatives,
      );
      expect(result).toEqual({ id: 'ac1', metaTemplates: [] });
    });

    it('rejects when couponId references a coupon that does not exist', async () => {
      mockPrisma.coupon.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.create('comp1', {
          name: 'Auto',
          type: 'BIRTHDAY',
          startDate: '2024-01-01',
          couponId: 'cp1',
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when coupon is expired', async () => {
      mockPrisma.coupon.findFirst.mockResolvedValueOnce({
        id: 'cp1',
        active: true,
        validUntil: new Date('2000-01-01'),
      });

      await expect(
        service.create('comp1', {
          name: 'Auto',
          type: 'BIRTHDAY',
          startDate: '2024-01-01',
          couponId: 'cp1',
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('throws when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates using repository with gift and creative logic', async () => {
      mockRepository.findById.mockResolvedValue({ id: 'ac1', companyId: 'comp1' });
      mockRepository.update.mockResolvedValue({ id: 'ac1', name: 'Updated' });

      const result = await service.update('ac1', {
        name: 'Updated',
        startDate: '2024-03-01',
        endDate: '2024-04-01',
        gifts: [{ name: 'New', value: 5 }],
        creatives: [{ imageUrls: ['i.jpg'], title: 't', message: 'm' }],
      } as any);

      expect(repository.update).toHaveBeenCalledWith(
        'ac1',
        expect.objectContaining({
          name: 'Updated',
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          gifts: { create: [{ name: 'New', value: 5 }] },
          creatives: { create: [{ imageUrls: ['i.jpg'], title: 't', message: 'm' }] },
        })
      );
      expect(result).toEqual({ id: 'ac1', name: 'Updated' });
    });

    it('does not revalidate the coupon when couponId is unchanged', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'ac1',
        companyId: 'comp1',
        couponId: 'cp1',
      });
      mockRepository.update.mockResolvedValue({ id: 'ac1', name: 'Updated' });

      await service.update('ac1', {
        name: 'Updated',
        couponId: 'cp1',
      } as any);

      expect(mockPrisma.coupon.findFirst).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith(
        'ac1',
        expect.objectContaining({ couponId: 'cp1' }),
      );
    });

    it('validates the coupon when it is being changed to a new id', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'ac1',
        companyId: 'comp1',
        couponId: 'cp1',
      });
      mockPrisma.coupon.findFirst.mockResolvedValueOnce({
        id: 'cp2',
        active: true,
        validUntil: new Date('2999-01-01'),
      });
      mockRepository.update.mockResolvedValue({ id: 'ac1' });

      await service.update('ac1', { couponId: 'cp2' } as any);

      expect(mockPrisma.coupon.findFirst).toHaveBeenCalledWith({
        where: { id: 'cp2', companyId: 'comp1', deletedAt: null },
      });
      expect(repository.update).toHaveBeenCalledWith(
        'ac1',
        expect.objectContaining({ couponId: 'cp2' }),
      );
    });

    it('reconciles existing Meta templates instead of recreating them when channel is WHATSAPP_BUSINESS_API', async () => {
      const previousCreative = {
        id: 'creative-old',
        imageUrls: ['old.jpg'],
        title: 'old',
        message: 'old msg',
        link: null,
        createdAt: new Date('2024-01-01T10:00:00Z'),
      };
      const updatedCreative = {
        id: 'creative-new',
        imageUrls: ['new.jpg'],
        title: 'new',
        message: 'new msg',
        link: null,
        createdAt: new Date('2024-02-01T10:00:00Z'),
      };

      mockRepository.findById.mockResolvedValue({
        id: 'ac1',
        companyId: 'comp1',
        channel: 'WHATSAPP_BUSINESS_API',
        creatives: [previousCreative],
      });
      mockRepository.update.mockResolvedValue({
        id: 'ac1',
        name: 'Renamed',
        companyId: 'comp1',
        channel: 'WHATSAPP_BUSINESS_API',
        creatives: [updatedCreative],
      });

      const previousTemplate = { id: 'tpl-old', metaTemplateId: 'meta-tpl-1' };
      mockMetaTemplatesService.findTemplatesByCreativeIdsOrdered.mockResolvedValueOnce([
        previousTemplate,
      ]);
      mockMetaTemplatesService.reconcileTemplatesForCampaign.mockResolvedValueOnce([
        { id: 'tpl-old', status: 'PENDING' },
      ]);

      await service.update('ac1', {
        name: 'Renamed',
        creatives: [{ imageUrls: ['new.jpg'], title: 'new', message: 'new msg' }],
      } as any);

      expect(
        mockMetaTemplatesService.findTemplatesByCreativeIdsOrdered,
      ).toHaveBeenCalledWith('comp1', ['creative-old']);
      expect(
        mockMetaTemplatesService.reconcileTemplatesForCampaign,
      ).toHaveBeenCalledWith('comp1', 'Renamed', [updatedCreative], [previousTemplate]);
      expect(
        mockMetaTemplatesService.archiveTemplatesByCreativeIds,
      ).not.toHaveBeenCalled();
      expect(mockMetaTemplatesService.createFromCreative).not.toHaveBeenCalled();
    });

    it('does not touch Meta templates when channel is not WHATSAPP_BUSINESS_API', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'ac1',
        companyId: 'comp1',
        channel: 'WHATSAPP_WEB',
        creatives: [],
      });
      mockRepository.update.mockResolvedValue({
        id: 'ac1',
        name: 'Renamed',
        channel: 'WHATSAPP_WEB',
        creatives: [],
      });

      await service.update('ac1', {
        name: 'Renamed',
        creatives: [{ imageUrls: ['x.jpg'], title: 't', message: 'm' }],
      } as any);

      expect(
        mockMetaTemplatesService.findTemplatesByCreativeIdsOrdered,
      ).not.toHaveBeenCalled();
      expect(
        mockMetaTemplatesService.reconcileTemplatesForCampaign,
      ).not.toHaveBeenCalled();
    });

    it('removes the coupon link without validation when couponId is null', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'ac1',
        companyId: 'comp1',
        couponId: 'cp1',
      });
      mockRepository.update.mockResolvedValue({ id: 'ac1' });

      await service.update('ac1', { couponId: null } as any);

      expect(mockPrisma.coupon.findFirst).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith(
        'ac1',
        expect.objectContaining({ couponId: null }),
      );
    });
  });

  describe('toggleActive', () => {
    it('pauses by aborting PENDING and PROCESSING', async () => {
      mockRepository.findById.mockResolvedValue({ id: 'ac1', active: true });
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
      mockPrisma.automaticCampaign.update.mockResolvedValue({});
      mockPrisma.message.updateMany.mockResolvedValue({ count: 2 });

      await service.toggleActive('ac1', 'comp1');

      expect(mockPrisma.automaticCampaign.update).toHaveBeenCalledWith({
        where: { id: 'ac1', companyId: 'comp1' },
        data: { active: false },
      });
      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith({
        where: {
          automaticCampaignId: 'ac1',
          status: { in: [MessageStatus.PENDING, MessageStatus.PROCESSING] },
        },
        data: {
          status: MessageStatus.ABORTED,
          error: CAMPAIGN_PAUSED_ABORT_ERROR,
        },
      });
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('resumes by clearing lastProcessedAt and enqueueing generation', async () => {
      mockRepository.findById.mockResolvedValue({ id: 'ac1', active: false });
      mockPrisma.automaticCampaign.update.mockResolvedValue({});

      await service.toggleActive('ac1', 'comp1');

      expect(mockPrisma.automaticCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ac1', companyId: 'comp1' },
          data: expect.objectContaining({ active: true, lastProcessedAt: null }),
        }),
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE,
        { automaticCampaignId: 'ac1' },
        expect.objectContaining({ jobId: expect.stringMatching(/^automatic-campaign:ac1:/) }),
      );
    });
  });

  describe('remove', () => {
    it('aborts unsent messages then soft deletes', async () => {
      mockRepository.findById.mockResolvedValue({ id: 'ac1' });
      mockPrisma.message.updateMany.mockResolvedValue({ count: 2 });
      mockRepository.softDelete.mockResolvedValue({ id: 'ac1', deletedAt: new Date() });

      const result = await service.remove('ac1');

      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith({
        where: {
          automaticCampaignId: 'ac1',
          status: { in: [MessageStatus.PENDING, MessageStatus.PROCESSING] },
        },
        data: {
          status: MessageStatus.ABORTED,
          error: CAMPAIGN_PAUSED_ABORT_ERROR,
        },
      });
      expect(repository.softDelete).toHaveBeenCalledWith('ac1');
      expect(result).toEqual({ id: 'ac1', deletedAt: expect.any(Date) });
    });
  });

  describe('restore', () => {
    it('restores deleted campaign via repository', async () => {
      mockRepository.restore.mockResolvedValue({ id: 'ac1', deletedAt: null });

      const result = await service.restore('ac1');

      expect(repository.restore).toHaveBeenCalledWith('ac1');
      expect(result).toEqual({ id: 'ac1', deletedAt: null });
    });
  });

  describe('duplicate', () => {
    it('preserves the sales visibility setting from the source campaign', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'ac1',
        companyId: 'comp1',
        name: 'Original',
        type: 'RECURRENCE',
        channel: 'WHATSAPP_WEB',
        targetingMode: 'RFV',
        segmentation: 'campeao',
        maxDailySends: 50,
        active: true,
        images: '',
        startDate: new Date('2024-01-01T00:00:00.000Z'),
        endDate: null,
        messageText: 'Mensagem',
        daysOfWeek: ['seg'],
        sendTimeStart: null,
        sendTimeEnd: null,
        couponId: null,
        metaMessageTemplateId: null,
        metaTemplateVariableMappings: null,
        gifts: [],
        creatives: [],
        showSalesOnCard: false,
      });
      mockRepository.createWithRelations.mockResolvedValue({
        id: 'ac-copy',
        channel: 'WHATSAPP_WEB',
      });

      await service.duplicate('comp1', 'ac1');

      expect(repository.createWithRelations).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'comp1',
          showSalesOnCard: false,
        }),
        undefined,
        undefined,
      );
    });
  });

  describe('findAll', () => {
    it('delegates to repository filters', async () => {
      mockRepository.findAllWithFilters.mockResolvedValue({ items: [{ id: 'ac1' }], total: 1 });

      const result = await service.findAll(
        'comp1',
        { page: 2, limit: 1 } as any,
        { active: true } as any,
      );

      expect(repository.findAllWithFilters).toHaveBeenCalledWith(
        'comp1',
        expect.any(Object),
        expect.any(Object),
      );
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getCampaignMessages', () => {
    it('delegates to repository using default date range (today) when no dates are provided', async () => {
      mockRepository.getCampaignMessages.mockResolvedValue({
        data: [{ id: 'm1', scheduledDate: '2024-01-01T10:00:00Z' }],
        meta: { total: 1, page: 1, limit: 1, totalPages: 1 },
      });

      const result = await service.getCampaignMessages('ac1', { page: 1, limit: 1 } as any);

      expect(repository.getCampaignMessages).toHaveBeenCalledTimes(1);
      const [campaignId, filterArg] = mockRepository.getCampaignMessages.mock.calls[0];
      expect(campaignId).toBe('ac1');
      expect(filterArg.startDate).toBeInstanceOf(Date);
      expect(filterArg.endDate).toBeInstanceOf(Date);
      expect(filterArg.startDate.getUTCHours()).toBe(0);
      expect(filterArg.endDate.getUTCHours()).toBe(23);
      expect(filterArg.rfvClassification).toBeUndefined();
      expect(filterArg.status).toBeUndefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('forwards custom date range, rfvClassification and status filters', async () => {
      mockRepository.getCampaignMessages.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      await service.getCampaignMessages('ac1', {
        startDate: '2024-05-01',
        endDate: '2024-05-15',
        rfvClassification: ['campeao', 'fiel'],
        status: ['SENT'],
      } as any);

      const [, filterArg] = mockRepository.getCampaignMessages.mock.calls[0];
      expect(filterArg.startDate.toISOString()).toBe('2024-05-01T00:00:00.000Z');
      expect(filterArg.endDate.toISOString()).toBe('2024-05-15T23:59:59.999Z');
      expect(filterArg.rfvClassification).toEqual(['campeao', 'fiel']);
      expect(filterArg.status).toEqual(['SENT']);
    });

    it('throws BadRequest when only startDate is provided', async () => {
      await expect(
        service.getCampaignMessages('ac1', { startDate: '2024-05-01' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getCampaignMetrics', () => {
    it('delegates to repository with resolved range from default filter', async () => {
      mockRepository.getCampaignMetrics.mockResolvedValue({
        campaignMetric: { id: 'cm1' },
        messagesSentByDate: [{ day: '01 jan', messages: 2, clicks: 1, sales: 1 }],
      });

      const result = await service.getCampaignMetrics('ac1', undefined as any);

      expect(repository.getCampaignMetrics).toHaveBeenCalledWith(
        'ac1',
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
      );
      expect(result.messagesSentByDate[0]).toEqual(expect.objectContaining({ messages: 2, clicks: 1, sales: 1 }));
    });

    it('delegates to repository using custom startDate/endDate', async () => {
      mockRepository.getCampaignMetrics.mockResolvedValue({
        campaignMetric: null,
        messagesSentByDate: [],
      });

      await service.getCampaignMetrics('ac1', {
        startDate: '2024-05-01',
        endDate: '2024-05-15',
      });

      const [, rangeArg] = mockRepository.getCampaignMetrics.mock.calls[0];
      expect(rangeArg.startDate.toISOString()).toBe('2024-05-01T03:00:00.000Z');
      expect(rangeArg.endDate.toISOString()).toBe('2024-05-16T02:59:59.999Z');
      expect(rangeArg.timeZone).toBe('America/Sao_Paulo');
    });

    it('throws BadRequest when only startDate is provided', async () => {
      await expect(
        service.getCampaignMetrics('ac1', { startDate: '2024-05-01' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});