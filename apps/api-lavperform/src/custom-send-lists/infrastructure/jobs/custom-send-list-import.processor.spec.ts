import { CustomSendListImportProcessor } from './custom-send-list-import.processor';

describe('CustomSendListImportProcessor', () => {
  const customersService = {
    findByPhone: jest.fn(),
    create: jest.fn(),
  };
  const repository = {
    findById: jest.fn(),
    addMember: jest.fn(),
    replaceMembers: jest.fn(),
  };
  const processor = new CustomSendListImportProcessor(
    customersService as any,
    repository as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findById.mockResolvedValue({
      id: 'list-1',
      companyId: 'company-1',
      deletedAt: null,
    });
  });

  it('reuses an existing customer without updating it', async () => {
    customersService.findByPhone.mockResolvedValue({
      id: 'customer-1',
      phone: '5511999999999',
    });

    await processor.handleImport({
      data: {
        companyId: 'company-1',
        listId: 'list-1',
        customers: [{
          name: 'Nome diferente',
          phone: '(11) 99999-9999',
          email: 'novo@example.com',
        }],
      },
    } as any);

    expect(customersService.findByPhone).toHaveBeenCalledWith(
      'company-1',
      '5511999999999',
    );
    expect(customersService.create).not.toHaveBeenCalled();
    expect(repository.addMember).toHaveBeenCalledWith('list-1', 'customer-1');
  });

  it('creates a missing customer before adding it to the list', async () => {
    customersService.findByPhone.mockResolvedValue(null);
    customersService.create.mockResolvedValue({
      id: 'customer-2',
      phone: '5511988888888',
    });

    await processor.handleImport({
      data: {
        companyId: 'company-1',
        listId: 'list-1',
        customers: [{
          name: 'Bia',
          phone: '(11) 98888-8888',
          whatsappOptin: true,
        }],
      },
    } as any);

    expect(customersService.create).toHaveBeenCalledWith('company-1', {
      name: 'Bia',
      phone: '5511988888888',
      whatsappOptin: true,
    });
    expect(repository.addMember).toHaveBeenCalledWith('list-1', 'customer-2');
  });

  it('does not add a customer to a list from another company', async () => {
    repository.findById.mockResolvedValue({
      id: 'list-1',
      companyId: 'other-company',
      deletedAt: null,
    });

    await expect(
      processor.handleImport({
        data: {
          companyId: 'company-1',
          listId: 'list-1',
          customers: [{ name: 'Ana', phone: '11999999999' }],
        },
      } as any),
    ).rejects.toThrow('Lista personalizada não encontrada');

    expect(repository.addMember).not.toHaveBeenCalled();
  });

  it('rejects an invalid phone without creating a customer', async () => {
    const result = await processor.handleImport({
      data: {
        companyId: 'company-1',
        listId: 'list-1',
        customers: [{ name: 'Ana', phone: '123' }],
      },
    } as any);

    expect(result).toEqual({ imported: 0, rejected: 1 });
    expect(customersService.create).not.toHaveBeenCalled();
    expect(repository.addMember).not.toHaveBeenCalled();
  });

  it('replaces members before processing customers in the same job', async () => {
    customersService.findByPhone.mockResolvedValue({
      id: 'customer-2',
      phone: '5511999999999',
    });

    await processor.handleImport(
      buildJob({
        companyId: 'company-1',
        listId: 'list-1',
        replaceCustomerIds: ['customer-1'],
        customers: [{ name: 'Ana', phone: '11999999999' }],
      }),
    );

    expect(repository.replaceMembers).toHaveBeenCalledWith('list-1', [
      'customer-1',
    ]);
    expect(repository.replaceMembers.mock.invocationCallOrder[0]).toBeLessThan(
      repository.addMember.mock.invocationCallOrder[0],
    );
  });

  it('does not replace members again when the job is retried', async () => {
    customersService.findByPhone.mockResolvedValue({
      id: 'customer-2',
      phone: '5511999999999',
    });

    const job = buildJob({
      companyId: 'company-1',
      listId: 'list-1',
      replaceCustomerIds: ['customer-1'],
      customers: [{ name: 'Ana', phone: '11999999999' }],
    });

    await processor.handleImport(job);
    await processor.handleImport(job);

    expect(repository.replaceMembers).toHaveBeenCalledTimes(1);
    expect(repository.addMember).toHaveBeenCalledTimes(2);
  });
});

function buildJob(data: Record<string, unknown>) {
  const job = {
    data,
    update: jest.fn(async (next: Record<string, unknown>) => {
      job.data = JSON.parse(JSON.stringify(next));
    }),
  };
  return job as any;
}
