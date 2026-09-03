import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CampaignChannel } from '@prisma/client';
import { getWhatsappVerificationCutoff } from '../../whatsapp/application/whatsapp-verification.policy';
import { CustomSendListsService } from './custom-send-lists.service';

describe('CustomSendListsService', () => {
  const repository = {
    create: jest.fn(),
    findById: jest.fn(),
    findAllWithFilters: jest.fn(),
    update: jest.fn(),
    replaceMembers: jest.fn(),
    updateMembers: jest.fn(),
    countMembers: jest.fn(),
    findMembersPaginated: jest.fn(),
    findAllMemberIds: jest.fn(),
    addMember: jest.fn(),
    softDelete: jest.fn(),
    countActiveCampaignReferences: jest.fn(),
  };

  const importQueue = {
    add: jest.fn(),
    addBulk: jest.fn(),
  };

  const prisma = {
    customer: { count: jest.fn() },
    customSendList: { findFirst: jest.fn() },
  } as any;

  let service: CustomSendListsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CustomSendListsService(repository as any, prisma, importQueue as any);
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

  it('creates an empty list for a pending CSV import', async () => {
    repository.create.mockResolvedValue({
      id: 'list-1',
      companyId: 'company-1',
      name: 'Lista CSV',
      description: null,
    });
    repository.countMembers.mockResolvedValue(0);

    const result = await service.create('company-1', {
      name: 'Lista CSV',
      customerIds: [],
    });

    expect(prisma.customer.count).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith({
      companyId: 'company-1',
      name: 'Lista CSV',
      description: null,
      customerIds: [],
    });
    expect(result.memberCount).toBe(0);
  });

  it('enqueues every CSV row for a list owned by the company', async () => {
    repository.findById.mockResolvedValue({
      id: 'list-1',
      companyId: 'company-1',
      deletedAt: null,
    });
    importQueue.add.mockResolvedValue({});
    const customers = [
      { name: 'Ana', phone: '11999999999' },
      { name: 'Bia', phone: '11888888888', email: 'bia@example.com' },
    ];

    const result = await service.enqueueCsvImport('company-1', 'list-1', customers);

    expect(importQueue.add).toHaveBeenCalledWith('process-import', {
      companyId: 'company-1',
      listId: 'list-1',
      customers: [
        { ...customers[0], phone: '5511999999999' },
        { ...customers[1], phone: '55119888888888' },
      ],
      replaceCustomerIds: undefined,
    });
    expect(result).toEqual({ queued: 2, rejected: 0 });
  });

  it('enqueues replacement before CSV rows', async () => {
    repository.findById.mockResolvedValue({
      id: 'list-1',
      companyId: 'company-1',
      deletedAt: null,
    });
    prisma.customer.count.mockResolvedValue(1);
    importQueue.add.mockResolvedValue({});

    await service.enqueueCsvImport(
      'company-1',
      'list-1',
      [{ name: 'Ana', phone: '11999999999' }],
      ['customer-1'],
    );

    expect(importQueue.add).toHaveBeenCalledWith('process-import', {
      companyId: 'company-1',
      listId: 'list-1',
      customers: [{ name: 'Ana', phone: '5511999999999' }],
      replaceCustomerIds: ['customer-1'],
    });
  });

  it('updates only explicit member additions and removals', async () => {
    repository.findById.mockResolvedValue({
      id: 'list-1',
      companyId: 'company-1',
      deletedAt: null,
    });
    prisma.customer.count.mockResolvedValue(1);
    repository.countMembers.mockResolvedValue(3);

    const result = await service.updateMembers('company-1', 'list-1', {
      addCustomerIds: ['customer-new'],
      removeCustomerIds: ['customer-old'],
    });

    expect(repository.updateMembers).toHaveBeenCalledWith(
      'list-1',
      ['customer-new'],
      ['customer-old'],
    );
    expect(result).toEqual({ memberCount: 3 });
  });

  it('does not enqueue CSV rows for a list from another company', async () => {
    repository.findById.mockResolvedValue({
      id: 'list-1',
      companyId: 'other-company',
      deletedAt: null,
    });

    await expect(
      service.enqueueCsvImport('company-1', 'list-1', [
        { name: 'Ana', phone: '11999999999' },
      ]),
    ).rejects.toThrow(NotFoundException);
    expect(importQueue.add).not.toHaveBeenCalled();
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
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-03T12:00:00.000Z'));

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
        whatsappVerifiedAt: {
          gte: getWhatsappVerificationCutoff(new Date('2026-09-03T12:00:00.000Z')),
        },
        customSendListMembers: { some: { listId: 'list-1' } },
      },
    });

    jest.useRealTimers();
  });

  it('returns every member id without pagination limits', async () => {
    repository.findById.mockResolvedValue({
      id: 'list-1',
      companyId: 'company-1',
      deletedAt: null,
    });
    repository.findAllMemberIds.mockResolvedValue(['c1', 'c2', 'c3']);

    const result = await service.getMemberIds('company-1', 'list-1');

    expect(result).toEqual({ customerIds: ['c1', 'c2', 'c3'] });
    expect(repository.findAllMemberIds).toHaveBeenCalledWith('list-1');
  });

  it('does not expose member ids of another company', async () => {
    repository.findById.mockResolvedValue({
      id: 'list-1',
      companyId: 'other-company',
      deletedAt: null,
    });

    await expect(service.getMemberIds('company-1', 'list-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(repository.findAllMemberIds).not.toHaveBeenCalled();
  });

  it('throws when list does not belong to company', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne('company-1', 'list-1', {})).rejects.toThrow(
      NotFoundException,
    );
  });
});
