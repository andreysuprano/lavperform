import { NotFoundException } from '@nestjs/common';
import { CampaignStatus } from '@prisma/client';
import { CampaignsService } from 'src/campaigns/application/campaigns.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ICampaignRepository } from 'src/campaigns/domain/campaign.repository.interface';

describe('CampaignsService', () => {
  let service: CampaignsService;
  let repository: ICampaignRepository;

  const mockRepository = {
    createWithMetric: jest.fn(),
    findAllWithFilters: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        {
          provide: 'ICampaignRepository',
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
    repository = module.get<ICampaignRepository>('ICampaignRepository');

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates campaign using repository', async () => {
      mockRepository.createWithMetric.mockResolvedValue({ id: 'camp1', name: 'Camp' });

      const result = await service.create('comp1', { name: 'Camp', scheduledDate: '2024-01-01' } as any);

      expect(repository.createWithMetric).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'comp1', name: 'Camp', scheduledDate: expect.any(Date), maxDailySends: 50 })
      );
      expect(result).toEqual({ id: 'camp1', name: 'Camp' });
    });
  });

  describe('findOne', () => {
    it('throws when campaign does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns campaign when exists', async () => {
      mockRepository.findById.mockResolvedValue({ id: 'camp1' });

      const result = await service.findOne('camp1');

      expect(result).toEqual({ id: 'camp1' });
    });
  });

  describe('update', () => {
    it('updates scheduledDate and delegates to repository', async () => {
      mockRepository.findById.mockResolvedValue({ id: 'camp1' });
      mockRepository.update.mockResolvedValue({ id: 'camp1', name: 'New' });

      const result = await service.update('camp1', { name: 'New', scheduledDate: '2024-01-01' } as any);

      expect(repository.update).toHaveBeenCalledWith(
        'camp1',
        expect.objectContaining({ name: 'New', scheduledDate: expect.any(Date) })
      );
      expect(result).toEqual({ id: 'camp1', name: 'New' });
    });

    it('throws when campaign not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'X' } as any)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('delegates to repository after validation', async () => {
      mockRepository.findById.mockResolvedValue({ id: 'camp1' });
      mockRepository.updateStatus.mockResolvedValue({ id: 'camp1', status: CampaignStatus.WAITING });

      const result = await service.updateStatus('camp1', CampaignStatus.WAITING);

      expect(repository.updateStatus).toHaveBeenCalledWith('camp1', CampaignStatus.WAITING);
      expect(result).toEqual({ id: 'camp1', status: CampaignStatus.WAITING });
    });

    it('throws when campaign is missing', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.updateStatus('missing', CampaignStatus.WAITING)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns formatted response from repository', async () => {
      mockRepository.findAllWithFilters.mockResolvedValue({ items: [{ id: 'c1' }], total: 1 });

      const result = await service.findAll('comp1', { page: 1, limit: 10 } as any, { startDate: undefined, endDate: undefined } as any);

      expect(repository.findAllWithFilters).toHaveBeenCalledWith('comp1', expect.any(Object), expect.any(Object));
      expect(result).toEqual({
        data: [{ id: 'c1' }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });
    });
  });

  describe('remove', () => {
    it('deletes campaign using repository', async () => {
      mockRepository.findById.mockResolvedValue({ id: 'camp1' });
      mockRepository.delete.mockResolvedValue({ id: 'camp1' });

      const result = await service.remove('camp1');

      expect(repository.delete).toHaveBeenCalledWith('camp1');
      expect(result).toEqual({ id: 'camp1' });
    });

    it('throws when campaign not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
