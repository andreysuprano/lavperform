import { WaymoneySalesService } from 'src/integrations/waymoney/application/waymoney-sales.service';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';

function harness() {
  const session = {
    listBranches: jest.fn(),
    listPayments: jest.fn(),
    listPackagePurchases: jest.fn(),
    getClient: jest.fn(),
  };
  const waymoneyService = {
    openSession: jest.fn().mockResolvedValue(session),
  };
  const prisma = {
    partner: { findUnique: jest.fn() },
    order: { findFirst: jest.fn() },
  };
  const repository = { findByCompanyAndPartner: jest.fn() };
  const customers = { resolveForSale: jest.fn() };
  const orders = { create: jest.fn() };
  const importQueue = { add: jest.fn(), getJob: jest.fn() };
  const saleQueue = { add: jest.fn() };
  const service = new WaymoneySalesService(
    waymoneyService as any,
    prisma as any,
    repository as any,
    customers as any,
    orders as any,
    importQueue as any,
    saleQueue as any,
  );
  prisma.partner.findUnique.mockResolvedValue({ id: 'partner-waymoney' });
  repository.findByCompanyAndPartner.mockResolvedValue({
    merchantId: 'loja@example.com',
    apiKey: 'secret',
  });
  return {
    service,
    session,
    waymoneyService,
    prisma,
    repository,
    customers,
    orders,
    saleQueue,
  };
}

describe('WaymoneySalesService', () => {
  it('não enfileira quando a integração está incompleta', async () => {
    const { service, repository, waymoneyService, saleQueue } = harness();
    repository.findByCompanyAndPartner.mockResolvedValue({
      merchantId: 'loja@example.com',
      apiKey: '',
    });

    await service.processDailySales('company-1', '2026-11-09');

    expect(waymoneyService.openSession).not.toHaveBeenCalled();
    expect(saleQueue.add).not.toHaveBeenCalled();
  });

  it('enfileira só ciclos e pacotes importáveis das duas filiais', async () => {
    const { service, session, saleQueue } = harness();
    session.listBranches.mockResolvedValue([
      { id: 'b1', name: 'Lavanderize', timezone: 'America/Sao_Paulo' },
      { id: 'b2', name: 'Lavanderize 2', timezone: 'America/Sao_Paulo' },
    ]);
    session.listPayments.mockImplementation(async (branchId: string) => [
      { id: `${branchId}-pix`, paymentMethod: 'PIX', finalTotal: 16.9 },
      { id: `${branchId}-pkg`, paymentMethod: 'PACKAGE', finalTotal: 16.9 },
      { id: `${branchId}-cash`, paymentMethod: 'CASHBACK', finalTotal: 16.9 },
      {
        id: `${branchId}-user`,
        paymentMethod: 'CREDIT',
        source: 'USER',
        finalTotal: 10,
      },
      {
        id: `${branchId}-refund`,
        paymentMethod: 'DEBIT',
        refundedAt: '2026-11-09T12:00:00.000Z',
        finalTotal: 16.9,
      },
    ]);
    session.listPackagePurchases.mockImplementation(async (branchId: string) => [
      { id: `${branchId}-buy`, amount: 90, paymentMethod: 'PIX' },
      { id: `${branchId}-points`, amount: 90, paymentMethod: 'POINTS' },
      { id: `${branchId}-zero`, amount: 0, paymentMethod: 'PIX' },
    ]);

    await service.processDailySales('company-1', '2026-11-09');

    const payloads = saleQueue.add.mock.calls.map((call) => call[1]);
    expect(saleQueue.add).toHaveBeenCalledTimes(4);
    expect(payloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          payment: expect.objectContaining({ id: 'b1-pix' }),
        }),
        expect.objectContaining({
          payment: expect.objectContaining({ id: 'b2-pix' }),
        }),
        expect.objectContaining({
          packagePurchase: expect.objectContaining({ id: 'b1-buy' }),
        }),
        expect.objectContaining({
          packagePurchase: expect.objectContaining({ id: 'b2-buy' }),
        }),
      ]),
    );
    expect(saleQueue.add).toHaveBeenCalledWith(
      QUEUE_NAMES.WAYMONEY_SALE_PROCESS,
      expect.anything(),
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it('não duplica pedido já importado', async () => {
    const { service, prisma, orders } = harness();
    prisma.order.findFirst.mockResolvedValue({ id: 'existing' });

    await service.processCycle('company-1', {
      id: 'pay-1',
      paymentMethod: 'PIX',
      finalTotal: 16.9,
    });

    expect(orders.create).not.toHaveBeenCalled();
  });

  it('grava cliente com CPF e segue sem cliente quando falta telefone e CPF', async () => {
    const { service, session, customers, orders } = harness();
    session.getClient.mockResolvedValueOnce({
      name: 'Ana',
      cpf: '09519249664',
      email: 'ana@example.com',
    });
    customers.resolveForSale.mockResolvedValue({ id: 'customer-1' });

    await service.processCycle('company-1', {
      id: 'pay-1',
      clientId: 'client-1',
      paymentMethod: 'CREDIT',
      finalTotal: 16.9,
      branch: { name: 'Lavanderize' },
      machine: { name: 'Lavadora 1', type: 'WASHER' },
    });

    expect(customers.resolveForSale).toHaveBeenCalledWith(
      expect.objectContaining({
        incoming: expect.objectContaining({ cpf: '09519249664', name: 'Ana' }),
      }),
    );
    expect(orders.create).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'customer-1' }),
    );

    session.getClient.mockResolvedValueOnce({
      name: 'Sem doc',
      email: 'sem@example.com',
    });
    await service.processCycle('company-1', {
      id: 'pay-2',
      clientId: 'client-2',
      paymentMethod: 'PIX',
      finalTotal: 16.9,
    });

    expect(orders.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ customerId: null }),
    );
  });

  it('ignora conflito único e ainda cria o pedido quando o cliente responde 404', async () => {
    const { service, session, orders } = harness();
    session.getClient.mockResolvedValue(null);
    orders.create.mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['companyId', 'integratorOrderId'] },
    });

    await expect(
      service.processCycle('company-1', {
        id: 'pay-1',
        clientId: 'missing',
        paymentMethod: 'PIX',
        finalTotal: 16.9,
      }),
    ).resolves.toBeUndefined();

    orders.create.mockResolvedValueOnce({ id: 'order-1' });
    await expect(
      service.processPackagePurchase('company-1', {
        id: 'pkg-1',
        clientId: 'missing',
        amount: 90,
        paymentMethod: 'PIX',
      }),
    ).resolves.toBeUndefined();
    expect(orders.create).toHaveBeenCalledTimes(2);
  });
});
