import { NotFoundException } from '@nestjs/common';
import { RenitencyService } from 'src/renitency/application/renitency.service';

describe('RenitencyService', () => {
  const repository: any = {
    create: jest.fn(),
    findByCompanyId: jest.fn(),
    update: jest.fn(),
  };

  let service: RenitencyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RenitencyService(repository);
  });

  describe('getOrCreateConfiguration', () => {
    it('returns existing configuration', async () => {
      const existing = { id: 'cfg1', companyId: 'comp1', minDaysBetween: 3 };
      repository.findByCompanyId.mockResolvedValue(existing);

      const result = await service.getOrCreateConfiguration('comp1');

      expect(result).toEqual(existing);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('creates default configuration when none exists', async () => {
      repository.findByCompanyId.mockResolvedValue(null);
      const created = { id: 'cfg2', companyId: 'comp1', minDaysBetween: 3 };
      repository.create.mockResolvedValue(created);

      const result = await service.getOrCreateConfiguration('comp1');

      expect(result).toEqual(created);
      expect(repository.create).toHaveBeenCalledWith({
        companyId: 'comp1',
        minDaysBetween: 3,
      });
    });
  });

  describe('updateConfiguration', () => {
    it('updates existing configuration', async () => {
      const existing = { id: 'cfg1', companyId: 'comp1', minDaysBetween: 3 };
      repository.findByCompanyId.mockResolvedValue(existing);
      const updated = { ...existing, minDaysBetween: 5 };
      repository.update.mockResolvedValue(updated);

      const result = await service.updateConfiguration('comp1', { minDaysBetween: 5 });

      expect(result.minDaysBetween).toBe(5);
      expect(repository.update).toHaveBeenCalledWith('cfg1', { minDaysBetween: 5 });
    });

    it('throws NotFoundException when config does not exist', async () => {
      repository.findByCompanyId.mockResolvedValue(null);

      await expect(
        service.updateConfiguration('comp1', { minDaysBetween: 5 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createDefaultConfiguration', () => {
    it('creates with minDaysBetween=3', async () => {
      const created = { id: 'cfg3', companyId: 'comp1', minDaysBetween: 3 };
      repository.create.mockResolvedValue(created);

      const result = await service.createDefaultConfiguration('comp1');

      expect(result.minDaysBetween).toBe(3);
    });
  });
});
