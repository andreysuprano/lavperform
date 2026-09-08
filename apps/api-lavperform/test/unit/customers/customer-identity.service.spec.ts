import { CustomerIdentityService } from 'src/customers/application/customer-identity.service';
import { IngestCustomerDto } from 'src/public-api/orders/application/dto/ingest-customer.dto';

describe('CustomerIdentityService', () => {
  let service: CustomerIdentityService;
  let customersService: {
    findByPhone: jest.Mock;
    findByCpf: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let prisma: {
    customerMergeReview: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };

  const incoming = (overrides: Partial<IngestCustomerDto> = {}): IngestCustomerDto =>
    ({
      name: 'João Silva',
      phone: '41997269435',
      ...overrides,
    }) as IngestCustomerDto;

  beforeEach(() => {
    customersService = {
      findByPhone: jest.fn().mockResolvedValue(null),
      findByCpf: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    };
    prisma = {
      customerMergeReview: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'review-1' }),
      },
    };
    service = new CustomerIdentityService(customersService as any, prisma as any);
  });

  it('cria cliente quando nao existe match', async () => {
    customersService.create.mockResolvedValue({
      id: 'cust-1',
      name: 'João Silva',
      phone: '5541997269435',
    });

    const result = await service.resolveForSale({
      companyId: 'company-1',
      incoming: incoming(),
    });

    expect(customersService.findByPhone).toHaveBeenCalledWith(
      'company-1',
      '5541997269435',
    );
    expect(customersService.create).toHaveBeenCalledTimes(1);
    expect(result?.id).toBe('cust-1');
  });

  it('reusa cliente existente com nome similar e atualiza dados', async () => {
    customersService.findByPhone.mockResolvedValue({
      id: 'cust-existing',
      name: 'Joao Silva',
      phone: '5541997269435',
      email: null,
      cpf: null,
    });
    customersService.update.mockResolvedValue({
      id: 'cust-existing',
      name: 'Joao Silva',
      email: 'novo@exemplo.com',
    });

    await service.resolveForSale({
      companyId: 'company-1',
      incoming: incoming({ email: 'novo@exemplo.com' }),
    });

    expect(customersService.create).not.toHaveBeenCalled();
    expect(customersService.update).toHaveBeenCalledWith(
      'company-1',
      'cust-existing',
      expect.objectContaining({ email: 'novo@exemplo.com' }),
    );
  });

  it('reusa o cliente do mesmo telefone mesmo quando o nome diverge', async () => {
    customersService.findByPhone.mockResolvedValue({
      id: 'cust-existing',
      name: 'João Silva',
      phone: '5541997269435',
    });
    customersService.update.mockResolvedValue({
      id: 'cust-existing',
      name: 'Maria Oliveira Santos',
      phone: '5541997269435',
    });

    const result = await service.resolveForSale({
      companyId: 'company-1',
      incoming: incoming({ name: 'Maria Oliveira Santos' }),
    });

    expect(result?.id).toBe('cust-existing');
    expect(customersService.create).not.toHaveBeenCalled();
    expect(customersService.update).toHaveBeenCalledWith(
      'company-1',
      'cust-existing',
      expect.objectContaining({ name: 'Maria Oliveira Santos' }),
    );
  });

  it('usa CPF quando nao ha telefone', async () => {
    customersService.findByCpf.mockResolvedValue({
      id: 'cust-existing',
      name: 'Joao Silva',
      phone: null,
      cpf: '12345678900',
    });
    customersService.update.mockResolvedValue({
      id: 'cust-existing',
      name: 'Joao Silva',
      phone: '5541997269435',
      cpf: '12345678900',
    });

    await service.resolveForSale({
      companyId: 'company-1',
      incoming: incoming({ cpf: '123.456.789-00' }),
    });

    expect(customersService.findByCpf).toHaveBeenCalledWith(
      'company-1',
      '12345678900',
    );
    expect(customersService.update).toHaveBeenCalled();
  });

  it('nao cria customer em marketplace sem CPF', async () => {
    const result = await service.resolveForSale({
      companyId: 'company-1',
      incoming: incoming({ phone: '41999999999' }),
      salesChannel: 'ifood',
    });

    expect(result).toBeNull();
    expect(customersService.findByPhone).not.toHaveBeenCalled();
    expect(customersService.create).not.toHaveBeenCalled();
  });

  it('ignora telefone em marketplace e identifica por CPF', async () => {
    customersService.findByCpf.mockResolvedValue({
      id: 'cust-existing',
      name: 'João Silva',
      phone: null,
      cpf: '12345678900',
    });
    customersService.update.mockResolvedValue({
      id: 'cust-existing',
      name: 'João Silva',
      cpf: '12345678900',
    });

    await service.resolveForSale({
      companyId: 'company-1',
      incoming: incoming({ cpf: '123.456.789-00', phone: '41999999999' }),
      salesChannel: 'ifood',
    });

    expect(customersService.findByPhone).not.toHaveBeenCalled();
    expect(customersService.findByCpf).toHaveBeenCalledWith(
      'company-1',
      '12345678900',
    );
  });

  it('nao cria customer quando a venda nao tem telefone nem CPF', async () => {
    const result = await service.resolveForSale({
      companyId: 'company-1',
      incoming: { name: 'Walk-in' },
    });

    expect(result).toBeNull();
    expect(customersService.findByPhone).not.toHaveBeenCalled();
    expect(customersService.findByCpf).not.toHaveBeenCalled();
    expect(customersService.create).not.toHaveBeenCalled();
  });

  it('grava revisao e usa o match de telefone quando telefone e CPF apontam para pessoas diferentes', async () => {
    customersService.findByPhone.mockResolvedValue({
      id: 'cust-phone',
      name: 'Ana',
      phone: '5541997269435',
    });
    customersService.findByCpf.mockResolvedValue({
      id: 'cust-cpf',
      name: 'Bruno',
      cpf: '12345678900',
    });
    customersService.update.mockResolvedValue({
      id: 'cust-phone',
      name: 'João Silva',
      phone: '5541997269435',
    });

    const result = await service.resolveForSale({
      companyId: 'company-1',
      incoming: incoming({ cpf: '123.456.789-00' }),
    });

    expect(result?.id).toBe('cust-phone');
    expect(customersService.create).not.toHaveBeenCalled();
    expect(prisma.customerMergeReview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: 'company-1',
          customerIdA: 'cust-cpf',
          customerIdB: 'cust-phone',
        }),
      }),
    );
  });

  it('reusa cliente criado em race condition', async () => {
    customersService.findByPhone
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'cust-race',
        name: 'João Silva',
        phone: '5541997269435',
      });
    customersService.create.mockRejectedValue(
      new Error('Já existe um cliente cadastrado com este telefone nesta empresa'),
    );

    const result = await service.resolveForSale({
      companyId: 'company-1',
      incoming: incoming(),
    });

    expect(customersService.create).toHaveBeenCalledTimes(1);
    expect(result?.id).toBe('cust-race');
  });
});
