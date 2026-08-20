import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CampaignChannel } from '@prisma/client';
import { CustomSendListsService } from './custom-send-lists.service';

describe('CustomSendListsService', () => {
  const repository = {
    create: jest.fn(),
    findById: jest.fn(),
    findAllWithFilters: jest.fn(),
    update: jest.fn(),
    replaceMembers: jest.fn(),
    countMembers: jest.fn(),
    findMembersPaginated: jest.fn(),
    softDelete: jest.fn(),
    countActiveCampaignReferences: jest.fn(),
  };

  const prisma = {
    customer: { count: jest.fn() },
    customSendList: { findFirst: jest.fn() },
  } as any;

  let service: CustomSendListsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CustomSendListsService(repository as any, prisma);
  });

  it('creates list when all customer ids belong to company', async () => {
    prisma.customer.count.mockResolvedValue(2);
    repository.create.mockResolvedValue({
      id: 'list-1',
      companyId: 'company-1',
      name: 'Lista',
      description: null,
    });
    repository.countMembers.mockResolvedValue(2);

    const result = await service.create('company-1', {
      name: 'Lista',
      customerIds: ['c1', 'c2'],
    });

    expect(result.memberCount).toBe(2);
    expect(repository.create).toHaveBeenCalledWith({
      companyId: 'company-1',
      name: 'Lista',
      description: null,
      customerIds: ['c1', 'c2'],
    });
  });

  it('rejects create when customer ids are invalid', async () => {
    prisma.customer.count.mockResolvedValue(1);

    await expect(
      service.create('company-1', {
        name: 'Lista',
        customerIds: ['c1', 'c2'],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks delete when list is referenced by active campaigns', async () => {
    repository.findById.mockResolvedValue({
      id: 'list-1',
      companyId: 'company-1',
      deletedAt: null,
    });
    repository.countActiveCampaignReferences.mockResolvedValue(1);

    await expect(service.remove('company-1', 'list-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('returns eligible count with channel filters', async () => {
    repository.findById.mockResolvedValue({
      id: 'list-1',
      companyId: 'company-1',
      deletedAt: null,
    });
    prisma.customer.count.mockResolvedValue(3);

    const result = await service.getEligibleCount(
      'company-1',
      'list-1',
      CampaignChannel.WHATSAPP_WEB,
    );

    expect(result.count).toBe(3);
    expect(prisma.customer.count).toHaveBeenCalledWith({
      where: {
        companyId: 'company-1',
        whatsappOptin: true,
        whatsappVerified: true,
        customSendListMembers: { some: { listId: 'list-1' } },
      },
    });
  });

  it('throws when list does not belong to company', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne('company-1', 'list-1', {})).rejects.toThrow(
      NotFoundException,
    );
  });
});
