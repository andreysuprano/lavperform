import { Job } from 'bull';
import { OrderIngestionProcessor } from 'src/public-api/orders/infrastructure/jobs/order-ingestion.processor';
import {
  PUBLIC_API_ORDER_INGESTION_JOB,
  PublicApiOrderIngestionJobData,
} from 'src/public-api/orders/application/order-ingestion.service';

describe('OrderIngestionProcessor', () => {
  let processor: OrderIngestionProcessor;
  let orderService: {
    findByExternalOrderId: jest.Mock;
    create: jest.Mock;
  };
  let customersService: {
    findByPhone: jest.Mock;
    findByCpf: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };

  const ctx = { apiKeyId: 'key-1', companyId: 'company-1' } as any;

  const basePayload = {
    externalOrderId: 'order-ext-1',
    displayId: 100,
    status: 'closed',
    orderType: 'delivery',
    orderTiming: 'instant',
    deliveryFee: 0,
    serviceFee: 0,
    additionalFee: 0,
    total: 50,
    createdAt: '2026-06-18T18:30:00.000Z',
    updatedAt: '2026-06-18T18:30:00.000Z',
  };

  const buildJob = (
    overrides: Partial<PublicApiOrderIngestionJobData['payload']> = {},
    extras: Partial<PublicApiOrderIngestionJobData> = {},
  ): Job<PublicApiOrderIngestionJobData> =>
    ({
      data: {
        ctx,
        payload: { ...basePayload, ...overrides } as any,
        ...extras,
      },
    }) as Job<PublicApiOrderIngestionJobData>;

  beforeEach(() => {
    orderService = {
      findByExternalOrderId: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'order-1' }),
    };
    customersService = {
      findByPhone: jest.fn().mockResolvedValue(null),
      findByCpf: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    };

    processor = new OrderIngestionProcessor(
      orderService as any,
      customersService as any,
    );
  });

  describe('quando o cliente nao existe', () => {
    it('cria um novo cliente e o pedido', async () => {
      customersService.create.mockResolvedValue({
        id: 'cust-1',
        name: 'João Silva',
        phone: '5541997269435',
      });

      const job = buildJob({
        customer: { name: 'João Silva', phone: '41997269435' },
      });

      const result = await processor.handle(job);

      expect(customersService.findByPhone).toHaveBeenCalledWith(
        'company-1',
        '5541997269435',
      );
      expect(customersService.create).toHaveBeenCalledTimes(1);
      expect(orderService.create).toHaveBeenCalled();
      expect(result).toEqual({ orderId: 'order-1' });
    });
  });

  describe('quando o cliente ja existe com mesmo telefone', () => {
    it('reusa o cliente existente quando o nome e similar e atualiza dados', async () => {
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
        phone: '5541997269435',
        email: 'novo@exemplo.com',
      });

      const job = buildJob({
        customer: {
          name: 'João Silva',
          phone: '41997269435',
          email: 'novo@exemplo.com',
        },
      });

      await processor.handle(job);

      expect(customersService.create).not.toHaveBeenCalled();
      expect(customersService.update).toHaveBeenCalledWith(
        'company-1',
        'cust-existing',
        expect.objectContaining({ email: 'novo@exemplo.com' }),
      );
      expect(orderService.create).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'cust-existing' }),
      );
    });

    it('cria um novo cliente SEM telefone quando o nome e muito diferente', async () => {
      customersService.findByPhone.mockResolvedValue({
        id: 'cust-existing',
        name: 'João Silva',
        phone: '5541997269435',
        email: null,
        cpf: null,
      });
      customersService.create.mockResolvedValue({
        id: 'cust-new',
        name: 'Maria Oliveira',
      });

      const job = buildJob({
        customer: {
          name: 'Maria Oliveira',
          phone: '41997269435',
        },
      });

      await processor.handle(job);

      expect(customersService.update).not.toHaveBeenCalled();
      expect(customersService.create).toHaveBeenCalledTimes(1);
      const [, createDto] = customersService.create.mock.calls[0];
      expect(createDto.phone).toBeUndefined();
      expect(createDto.name).toBe('Maria Oliveira');
      expect(orderService.create).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'cust-new' }),
      );
    });
  });

  describe('quando o cliente ja existe com mesmo cpf', () => {
    it('atualiza quando o nome e similar', async () => {
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

      const job = buildJob({
        customer: {
          name: 'João Silva',
          phone: '41997269435',
          cpf: '123.456.789-00',
        },
      });

      await processor.handle(job);

      expect(customersService.findByPhone).toHaveBeenCalled();
      expect(customersService.findByCpf).toHaveBeenCalledWith(
        'company-1',
        '12345678900',
      );
      expect(customersService.update).toHaveBeenCalled();
      expect(customersService.create).not.toHaveBeenCalled();
    });

    it('cria novo cliente SEM cpf quando o nome diverge', async () => {
      customersService.findByCpf.mockResolvedValue({
        id: 'cust-existing',
        name: 'João Silva',
        phone: null,
        cpf: '12345678900',
      });
      customersService.create.mockResolvedValue({
        id: 'cust-new',
        name: 'Maria Oliveira',
      });

      const job = buildJob({
        customer: {
          name: 'Maria Oliveira',
          phone: '41988887777',
          cpf: '123.456.789-00',
        },
      });

      await processor.handle(job);

      expect(customersService.create).toHaveBeenCalledTimes(1);
      const [, createDto] = customersService.create.mock.calls[0];
      expect(createDto.cpf).toBeUndefined();
      expect(createDto.phone).toBe('5541988887777');
    });
  });

  describe('em canais de marketplace', () => {
    it('ignora telefone e usa apenas CPF para identificar', async () => {
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

      const job = buildJob({
        salesChannel: 'ifood',
        customer: {
          name: 'João Silva',
          phone: '41999999999',
          cpf: '123.456.789-00',
        },
      });

      await processor.handle(job);

      expect(customersService.findByPhone).not.toHaveBeenCalled();
      expect(customersService.findByCpf).toHaveBeenCalledWith(
        'company-1',
        '12345678900',
      );
    });

    it('cria cliente SEM telefone mesmo quando nenhum match e encontrado', async () => {
      customersService.create.mockResolvedValue({
        id: 'cust-new',
        name: 'Cliente iFood',
      });

      const job = buildJob({
        salesChannel: 'ifood',
        customer: {
          name: 'Cliente iFood',
          phone: '41999999999',
          cpf: '123.456.789-00',
        },
      });

      await processor.handle(job);

      const [, createDto] = customersService.create.mock.calls[0];
      expect(createDto.phone).toBeUndefined();
      expect(createDto.cpf).toBe('12345678900');
    });

    it('detecta marketplace via slug do partner quando salesChannel nao informa', async () => {
      customersService.create.mockResolvedValue({
        id: 'cust-new',
        name: 'Cliente Rappi',
      });

      const job = buildJob(
        {
          customer: {
            name: 'Cliente Rappi',
            phone: '41999999999',
          },
        },
        {
          partner: {
            id: 'p1',
            partnerSlug: 'rappi',
            name: 'Rappi',
          },
        },
      );

      await processor.handle(job);

      expect(customersService.findByPhone).not.toHaveBeenCalled();
      const [, createDto] = customersService.create.mock.calls[0];
      expect(createDto.phone).toBeUndefined();
    });
  });

  describe('protecao contra race condition', () => {
    it('reusa o cliente criado por outro job quando o create falha', async () => {
      customersService.findByPhone
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'cust-race',
          name: 'João Silva',
          phone: '5541997269435',
        });
      customersService.create.mockRejectedValue(
        new Error('Já existe um cliente cadastrado com este telefone nesta empresa'),
      );

      const job = buildJob({
        customer: { name: 'João Silva', phone: '41997269435' },
      });

      await processor.handle(job);

      expect(customersService.create).toHaveBeenCalledTimes(1);
      expect(customersService.findByPhone).toHaveBeenCalledTimes(2);
      expect(orderService.create).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'cust-race' }),
      );
    });

    it('propaga o erro quando o lookup pos-falha tambem nao encontra cliente', async () => {
      customersService.findByPhone.mockResolvedValue(null);
      customersService.create.mockRejectedValue(new Error('Erro inesperado'));

      const job = buildJob({
        customer: { name: 'João Silva', phone: '41997269435' },
      });

      await expect(processor.handle(job)).rejects.toThrow('Erro inesperado');
    });
  });

  describe('pedido idempotente', () => {
    it('ignora pedido ja recebido', async () => {
      orderService.findByExternalOrderId.mockResolvedValue({ id: 'order-existing' });

      const job = buildJob({
        customer: { name: 'João', phone: '41997269435' },
      });

      const result = await processor.handle(job);

      expect(result).toEqual({ skipped: true, orderId: 'order-existing' });
      expect(customersService.create).not.toHaveBeenCalled();
      expect(orderService.create).not.toHaveBeenCalled();
    });
  });

  it('usa o nome correto do job', () => {
    expect(PUBLIC_API_ORDER_INGESTION_JOB).toBe('ingest-order');
  });
});
