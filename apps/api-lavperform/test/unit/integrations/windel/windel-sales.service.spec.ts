import { Logger } from '@nestjs/common';
import { WindelSalesService } from 'src/integrations/windel/application/windel-sales.service';
import { WindelServiceOrderDetail } from 'src/integrations/windel/api/windel.types';
import { windelIntegratorOrderId, windelSaleToOrder } from 'src/integrations/windel/mappings/windel-sale-mapping';

function buildOrder(
  overrides: Partial<WindelServiceOrderDetail> = {},
): WindelServiceOrderDetail {
  return {
    id: 1764549,
    numero: 5962,
    serie: 'OS',
    situacao: 'Atendido',
    valorTotal: 80,
    valorDesconto: 5,
    empresaId: 12,
    pessoaId: 9,
    pessoaNome: 'Ana',
    pessoaCpfCnpj: '123',
    createdAt: '2026-10-20T14:34:00.485Z',
    movDocs: [
      {
        xProd: 'Camisa',
        quantidade: 2,
        valorUnitario: 40,
        valorTotal: 80,
        servico: true,
      },
    ],
    formaDePagamentoDocs: [{ valor: 80, formaDePagamento: { nome: 'PIX' } }],
    ...overrides,
  };
}

describe('WindelSalesService', () => {
  const windelService = {
    listAttendedOrders: jest.fn(),
    getOrder: jest.fn(),
    getPerson: jest.fn(),
  };
  const prisma = {
    partner: { findUnique: jest.fn() },
    company: { findUnique: jest.fn() },
    order: { findFirst: jest.fn() },
  };
  const repository = { findByCompanyAndPartner: jest.fn() };
  const customerIdentityService = { resolveForSale: jest.fn() };
  const orderService = { create: jest.fn() };
  const salesImportQueue = { add: jest.fn(), getJob: jest.fn() };
  const saleProcessQueue = { add: jest.fn() };

  let service: WindelSalesService;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    prisma.partner.findUnique.mockResolvedValue({ id: 'partner-windel' });
    customerIdentityService.resolveForSale.mockResolvedValue({ id: 'customer-1' });
    orderService.create.mockResolvedValue({ id: 'order-1' });
    saleProcessQueue.add.mockResolvedValue({ id: 'job-1' });
    service = new WindelSalesService(
      windelService as any,
      prisma as any,
      repository as any,
      customerIdentityService as any,
      orderService as any,
      salesImportQueue as any,
      saleProcessQueue as any,
    );
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    jest.useRealTimers();
  });

  it('retorna sem listar quando não há merchantId ou apiKey', async () => {
    repository.findByCompanyAndPartner.mockResolvedValue({
      merchantId: '',
      apiKey: null,
    });

    await expect(
      service.processDailySales('company-1', '2026-10-20'),
    ).resolves.toBeUndefined();

    repository.findByCompanyAndPartner.mockResolvedValue({
      merchantId: '',
      apiKey: 'secret',
    });
    await expect(
      service.processDailySales('company-1', '2026-10-20'),
    ).resolves.toBeUndefined();

    repository.findByCompanyAndPartner.mockResolvedValue({
      merchantId: 'loja@example.com',
      apiKey: null,
    });
    await expect(
      service.processDailySales('company-1', '2026-10-20'),
    ).resolves.toBeUndefined();

    expect(prisma.partner.findUnique).toHaveBeenCalledWith({
      where: { partnerSlug: 'WINDEL' },
    });
    expect(repository.findByCompanyAndPartner).toHaveBeenCalledWith(
      'company-1',
      'partner-windel',
    );
    expect(windelService.listAttendedOrders).not.toHaveBeenCalled();
  });

  it('enfileira só a ordem Atendido depois de buscar detalhe e pessoa', async () => {
    jest.useFakeTimers();
    repository.findByCompanyAndPartner.mockResolvedValue({
      merchantId: 'loja@example.com',
      apiKey: 'secret',
    });
    const detail = buildOrder({ id: 11, pessoaId: 9 });
    const person = {
      nome: 'Ana Pessoa',
      telefone: '11999999999',
      email: 'a@b.co',
      cpfCnpj: '999',
    };
    windelService.listAttendedOrders.mockResolvedValue([
      { id: 11, situacao: 'Atendido', pessoa: { id: 99 } },
      { id: 22, situacao: 'Parcial' },
    ]);
    windelService.getOrder.mockResolvedValue(detail);
    windelService.getPerson.mockResolvedValue(person);

    const pending = service.processDailySales('company-1', '2026-10-20');
    for (let i = 0; i < 20; i += 1) {
      await Promise.resolve();
    }
    expect(windelService.getOrder).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(400);
    expect(windelService.getOrder).toHaveBeenCalledTimes(1);
    expect(windelService.getOrder).toHaveBeenCalledWith(
      { email: 'loja@example.com', password: 'secret' },
      11,
    );
    expect(windelService.getPerson).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(400);
    await pending;

    expect(windelService.listAttendedOrders).toHaveBeenCalledWith(
      { email: 'loja@example.com', password: 'secret' },
      '2026-10-20',
    );
    expect(windelService.getPerson).toHaveBeenCalledTimes(1);
    expect(windelService.getPerson).toHaveBeenCalledWith(
      { email: 'loja@example.com', password: 'secret' },
      9,
    );
    expect(saleProcessQueue.add).toHaveBeenCalledTimes(1);
    expect(saleProcessQueue.add).toHaveBeenCalledWith(
      'windel-sale-process',
      { companyId: 'company-1', order: detail, person },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
    const messages = logSpy.mock.calls.map((args) => args.map(String).join(' '));
    expect(
      messages.some((message) => message.includes('22') && message.includes('Parcial')),
    ).toBe(true);
  });

  it('não resolve cliente nem cria pedido quando integratorOrderId já existe', async () => {
    const order = buildOrder();
    prisma.order.findFirst.mockResolvedValue({
      id: 'order-existing',
      integratorOrderId: windelIntegratorOrderId(order.id),
    });

    await expect(
      service.processSale('company-1', order, { telefone: '11999999999' }),
    ).resolves.toBeUndefined();

    expect(prisma.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 'company-1',
          salesChannel: 'WINDEL',
          integratorOrderId: windelIntegratorOrderId(order.id),
        },
      }),
    );
    expect(customerIdentityService.resolveForSale).not.toHaveBeenCalled();
    expect(orderService.create).not.toHaveBeenCalled();
  });

  it('grava cliente e pedido e ignora conflito único de integratorOrderId', async () => {
    prisma.order.findFirst.mockResolvedValue(null);
    const order = buildOrder();
    const person = {
      nome: 'Ana Pessoa',
      telefone: '11999999999',
      telefoneContato: '11888888888',
      email: 'a@b.co',
      cpfCnpj: '999',
    };

    await service.processSale('company-1', order, person);

    expect(customerIdentityService.resolveForSale).toHaveBeenCalledWith({
      companyId: 'company-1',
      incoming: {
        name: 'Ana',
        phone: '11999999999',
        cpf: '123',
        email: 'a@b.co',
      },
    });
    const createdAt = new Date(order.createdAt);
    expect(orderService.create).toHaveBeenCalledWith({
      ...windelSaleToOrder(order, person, 'customer-1', 'company-1'),
      createdAt,
      updatedAt: createdAt,
    });

    await service.processSale(
      'company-1',
      buildOrder({
        pessoaNome: undefined,
        pessoaCpfCnpj: undefined,
        pessoa: { nome: 'Bruno', cpfCnpj: '321' },
      }),
      { telefoneContato: '11888888888', email: 'b@b.co', nome: 'Pessoa' },
    );
    expect(customerIdentityService.resolveForSale).toHaveBeenLastCalledWith({
      companyId: 'company-1',
      incoming: {
        name: 'Bruno',
        phone: '11888888888',
        cpf: '321',
        email: 'b@b.co',
      },
    });

    await service.processSale(
      'company-1',
      buildOrder({
        pessoaNome: ' ',
        pessoaCpfCnpj: undefined,
        pessoa: { nome: undefined, cpfCnpj: '654' },
      }),
      { nome: 'Carla', cpfCnpj: '777', email: 'c@b.co', telefone: '11777777777' },
    );
    expect(customerIdentityService.resolveForSale).toHaveBeenLastCalledWith({
      companyId: 'company-1',
      incoming: {
        name: 'Carla',
        phone: '11777777777',
        cpf: '777',
        email: 'c@b.co',
      },
    });

    await service.processSale(
      'company-1',
      buildOrder({
        pessoaId: null,
        pessoaNome: undefined,
        pessoaCpfCnpj: '456',
        pessoa: null,
      }),
      null,
    );
    const withoutPerson = customerIdentityService.resolveForSale.mock.calls.at(-1)[0];
    expect(withoutPerson).toEqual({
      companyId: 'company-1',
      incoming: { name: 'Cliente', cpf: '456' },
    });
    expect(withoutPerson.incoming).not.toHaveProperty('phone');
    expect(withoutPerson.incoming).not.toHaveProperty('email');

    const uniqueArray = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
      meta: { target: ['companyId', 'integratorOrderId'] },
    });
    orderService.create.mockRejectedValueOnce(uniqueArray);
    await expect(service.processSale('company-1', order, person)).resolves.toBeUndefined();

    const uniqueString = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
      meta: { target: 'Order_companyId_integratorOrderId_key' },
    });
    orderService.create.mockRejectedValueOnce(uniqueString);
    await expect(service.processSale('company-1', order, person)).resolves.toBeUndefined();

    const otherTarget = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
      meta: { target: ['companyId', 'externalOrderId'] },
    });
    orderService.create.mockRejectedValueOnce(otherTarget);
    await expect(service.processSale('company-1', order, person)).rejects.toBe(otherTarget);

    const missingTarget = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
    });
    orderService.create.mockRejectedValueOnce(missingTarget);
    await expect(service.processSale('company-1', order, person)).rejects.toBe(missingTarget);
  });
});
