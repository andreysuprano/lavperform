import { BadRequestException, ConflictException } from '@nestjs/common';
import { CustomerDuplicateService } from 'src/deduplication/application/customer-duplicate.service';

describe('CustomerDuplicateService', () => {
  const prisma = {} as any;
  const rfvQueue = { add: jest.fn() };
  let service: CustomerDuplicateService;

  beforeEach(() => {
    service = new CustomerDuplicateService(prisma, rfvQueue as any);
  });

  it('rejects merge without absorbed ids', async () => {
    await expect(
      service.merge('company-1', 'surv-1', ['surv-1']),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('scanAndAutoMerge dry-run does not call merge or normalize', async () => {
    const normalize = jest.spyOn(service, 'normalizeIdentifiers');
    jest.spyOn(service, 'preview').mockResolvedValue({
      companyId: 'company-1',
      autoMergeGroups: 1,
      reviewGroups: 3,
      groupsToAutoMerge: [
        {
          matchType: 'phone',
          matchValue: '5511999',
          survivorId: 'surv-1',
          absorbedIds: ['abs-1'],
        },
      ],
      review: [],
    });
    const merge = jest.spyOn(service, 'merge');

    const result = await service.scanAndAutoMerge('company-1', { dryRun: true });

    expect(normalize).not.toHaveBeenCalled();
    expect(merge).not.toHaveBeenCalled();
    expect(result).toEqual({
      companyId: 'company-1',
      normalized: 0,
      mergedGroups: 0,
      absorbed: 0,
      skipped: 0,
      pendingAutoGroups: 1,
      reviewGroups: 3,
      dryRun: true,
    });
  });

  it('scanAndAutoMerge merges auto groups and skips already-removed conflicts', async () => {
    jest.spyOn(service, 'normalizeIdentifiers').mockResolvedValue({ updated: 0 });
    jest
      .spyOn(service, 'preview')
      .mockResolvedValueOnce({
        companyId: 'company-1',
        autoMergeGroups: 2,
        reviewGroups: 1,
        groupsToAutoMerge: [
          {
            matchType: 'phone',
            matchValue: '1',
            survivorId: 'surv-1',
            absorbedIds: ['abs-1'],
          },
          {
            matchType: 'cpf',
            matchValue: '2',
            survivorId: 'surv-1',
            absorbedIds: ['abs-1'],
          },
        ],
        review: [],
      })
      .mockResolvedValueOnce({
        companyId: 'company-1',
        autoMergeGroups: 0,
        reviewGroups: 1,
        groupsToAutoMerge: [],
        review: [],
      });
    const merge = jest
      .spyOn(service, 'merge')
      .mockResolvedValueOnce({ survivorId: 'surv-1', absorbedIds: ['abs-1'] })
      .mockRejectedValueOnce(new ConflictException('já removidos'));

    const result = await service.scanAndAutoMerge('company-1');

    expect(merge).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      companyId: 'company-1',
      normalized: 0,
      mergedGroups: 1,
      absorbed: 1,
      skipped: 1,
      pendingAutoGroups: 0,
      reviewGroups: 1,
      dryRun: false,
    });
  });
});
