import { NotFoundException } from '@nestjs/common';
import { SwlSalesService } from 'src/integrations/swl/application/swl-sales.service';
import { SwlPermanentHttpError } from 'src/integrations/swl/api/swl-http.error';
import {
  swlAuthBlockKey,
  swlTokenHash,
} from 'src/integrations/swl/swl-auth-block';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';
import { SwlAtendimento } from 'src/integrations/swl/api/swl.types';

const TOKEN = 'swl_lavperform_key_secret';
const NOW = new Date('2026-11-25T15:00:00.000Z');

function atendimento(overrides: Partial<SwlAtendimento> = {}): SwlAtendimento {
  return {
    id: 10,
    situacao: 'ATIVO',
    concluido: true,
    status: { pagamento: 'PAGO', entrega: 'ENTREGUE' },
    clienteId: 7,
    centroDeCustoId: 3,
    datas: { abertura: '2026-11-20T10:00:00-03:00' },
    valores: { liquido: '50.00', total: '50.00' },
    itens: [
      {
        id: 1,
        itemId: 5,
        descricao: 'Lavagem',
        quantidade: '1',
        valorUnitario: '50.00',
        valorTotal: '50.00',
      },
    ],
    pagamentos: [
      {
        id: 1,
        registradoEm: '2026-11-20T10:05:00-03:00',
        valor: '50.00',
        forma: 'PIX',
        situacao: 'ATIVO',
      },
    ],
    atualizadoEm: '2026-11-20T10:05:00-03:00',
    ...overrides,
  };
}

function harness() {
  const swl = {
    getLavanderia: jest.fn().mockResolvedValue({
      nome: 'Lavanderia',
      centrosDeCusto: [{ id: 3, nome: 'Loja Centro', ativo: true }],
    }),
    listClientes: jest.fn().mockResolvedValue({ data: [], pagination: {} }),
    listExcluidos: jest.fn().mockResolvedValue({ data: [], pagination: {} }),
    listAtendimentos: jest.fn().mockResolvedValue({ data: [], pagination: {} }),
    listAll: jest.fn(
      async (fetchPage: (cursor?: string) => Promise<{ data: unknown[] }>) =>
        (await fetchPage(undefined)).data,
    ),
  };
  const tx = {
    order: { update: jest.fn() },
    orderItem: { deleteMany: jest.fn(), createMany: jest.fn() },
    orderPayment: { deleteMany: jest.fn(), createMany: jest.fn() },
    orderDiscount: { deleteMany: jest.fn(), createMany: jest.fn() },
    swlCustomerLink: { delete: jest.fn() },
    customer: { delete: jest.fn() },
    address: { deleteMany: jest.fn() },
  };
  const prisma = {
    partner: { findUnique: jest.fn().mockResolvedValue({ id: 'partner-swl' }) },
    swlSyncState: { findUnique: jest.fn(), upsert: jest.fn() },
    swlCustomerLink: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    order: { count: jest.fn().mockResolvedValue(0) },
    message: { count: jest.fn().mockResolvedValue(0) },
    customSendListMember: { count: jest.fn().mockResolvedValue(0) },
    customer: { findUnique: jest.fn() },
    $transaction: jest.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
  };
  const repository = {
    findByCompanyAndPartner: jest.fn().mockResolvedValue({ apiKey: TOKEN }),
  };
  const customers = { resolveForSale: jest.fn() };
  const orders = { create: jest.fn(), findByExternalOrderId: jest.fn() };
  const importQueue = { add: jest.fn(), getJob: jest.fn() };
  const saleQueue = { add: jest.fn() };
  const redis = { setJson: jest.fn(), getJson: jest.fn() };
  prisma.swlSyncState.findUnique.mockResolvedValue(null);
  orders.findByExternalOrderId.mockResolvedValue(null);
  importQueue.add.mockResolvedValue({ id: 'job', timestamp: 1 });
  importQueue.getJob.mockResolvedValue(null);

  const service = new SwlSalesService(
    swl as any,
    prisma as any,
    repository as any,
    customers as any,
    orders as any,
    importQueue as any,
    saleQueue as any,
    redis as any,
  );
  return {
    service,
    swl,
    prisma,
    tx,
    repository,
    customers,
    orders,
    importQueue,
    saleQueue,
    redis,
  };
}

describe('SwlSalesService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('syncCompany', () => {
    it('termina sem lançar quando não há token', async () => {
      const { service, repository, swl } = harness();
      repository.findByCompanyAndPartner.mockResolvedValue({ apiKey: '' });

      await expect(
        service.syncCompany('company-1', 'incremental'),
      ).resolves.toBeUndefined();

      expect(swl.getLavanderia).not.toHaveBeenCalled();
    });

    it('lança quando o parceiro SWL não existe', async () => {
      const { service, prisma } = harness();
      prisma.partner.findUnique.mockResolvedValue(null);

      await expect(
        service.syncCompany('company-1', 'incremental'),
      ).rejects.toThrow('Partner SWL não encontrado');
    });

    it('no histórico lê por janelas de data e nunca envia updatedSince', async () => {
      const { service, swl, saleQueue } = harness();
      swl.listAtendimentos.mockResolvedValue({
        data: [atendimento({ id: 1 }), atendimento({ id: 2 })],
        pagination: { nextCursor: null, limit: 100 },
      });

      await service.syncCompany('company-1', 'historical', {
        startDate: '2026-08-01',
        endDate: '2026-11-09',
      });

      // 101 dias: 31 + 31 + 31 + 8
      expect(swl.listAtendimentos).toHaveBeenCalledTimes(4);
      for (const call of swl.listAtendimentos.mock.calls) {
        expect(call[0]).toBe(TOKEN);
        expect(call[1]).toEqual(
          expect.objectContaining({
            dataInicio: expect.any(String),
            dataFim: expect.any(String),
          }),
        );
        expect(call[1]).not.toHaveProperty('updatedSince');
      }
      expect(swl.listAtendimentos.mock.calls[0][1]).toEqual(
        expect.objectContaining({
          dataInicio: '2026-08-01',
          dataFim: '2026-09-01',
        }),
      );
      expect(swl.listAtendimentos.mock.calls[3][1].dataFim).toBe('2026-11-10');
      expect(swl.listClientes.mock.calls[0][1]).not.toHaveProperty(
        'updatedSince',
      );
      expect(saleQueue.add).toHaveBeenCalledTimes(8);
      expect(saleQueue.add).toHaveBeenCalledWith(
        QUEUE_NAMES.SWL_SALE_PROCESS,
        {
          companyId: 'company-1',
          atendimento: expect.objectContaining({ id: 1 }),
          centroNome: 'Loja Centro',
        },
        expect.objectContaining({ attempts: 3 }),
      );
    });

    it('no histórico sem datas usa os últimos 90 dias', async () => {
      const { service, swl } = harness();

      await service.syncCompany('company-1', 'historical');

      const first = swl.listAtendimentos.mock.calls[0][1];
      const last =
        swl.listAtendimentos.mock.calls[
          swl.listAtendimentos.mock.calls.length - 1
        ][1];
      expect(first.dataInicio).toBe('2026-08-27');
      expect(last.dataFim).toBe('2026-11-26');
    });

    it('sem nenhum atendimento na carga inicial o marco é a data final à meia-noite de São Paulo', async () => {
      const { service, prisma } = harness();

      await service.syncCompany('company-1', 'historical', {
        startDate: '2026-11-01',
        endDate: '2026-11-09',
      });

      expect(prisma.swlSyncState.upsert).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { companyId: 'company-1' },
          update: {
            attendancesWatermark: new Date('2026-11-10T03:00:00.000Z'),
          },
        }),
      );
    });

    it('no incremental usa o marco menos 5 minutos em clientes, excluídos e atendimentos', async () => {
      const { service, swl, prisma } = harness();
      const watermark = new Date('2026-11-25T14:00:00.000Z');
      prisma.swlSyncState.findUnique.mockResolvedValue({
        customersWatermark: watermark,
        deletionsWatermark: watermark,
        attendancesWatermark: watermark,
      });

      await service.syncCompany('company-1', 'incremental');

      const expected = '2026-11-25T10:55:00.000-03:00';
      expect(swl.listClientes).toHaveBeenCalledWith(TOKEN, {
        updatedSince: expected,
        cursor: undefined,
      });
      expect(swl.listExcluidos).toHaveBeenCalledWith(TOKEN, {
        updatedSince: expected,
        cursor: undefined,
      });
      expect(swl.listAtendimentos).toHaveBeenCalledWith(TOKEN, {
        updatedSince: expected,
        cursor: undefined,
      });
      const attendanceQuery = swl.listAtendimentos.mock.calls[0][1];
      expect(attendanceQuery).not.toHaveProperty('dataInicio');
      expect(attendanceQuery).not.toHaveProperty('dataFim');
    });

    it('no incremental lê a lista inteira quando o marco da lista é nulo', async () => {
      const { service, swl, prisma } = harness();
      prisma.swlSyncState.findUnique.mockResolvedValue({
        customersWatermark: null,
        deletionsWatermark: null,
        attendancesWatermark: new Date('2026-11-25T14:00:00.000Z'),
      });

      await service.syncCompany('company-1', 'incremental');

      expect(swl.listClientes.mock.calls[0][1].updatedSince).toBeUndefined();
      expect(swl.listExcluidos.mock.calls[0][1].updatedSince).toBeUndefined();
      expect(swl.listAtendimentos.mock.calls[0][1].updatedSince).toBeDefined();
    });

    it('grava os marcos com o maior instante recebido e só depois da lista', async () => {
      const { service, swl, prisma } = harness();
      prisma.swlSyncState.findUnique.mockResolvedValue({
        customersWatermark: new Date('2026-11-20T00:00:00.000Z'),
        deletionsWatermark: null,
        attendancesWatermark: new Date('2026-11-20T00:00:00.000Z'),
      });
      swl.listClientes.mockResolvedValue({
        data: [
          { id: 1, atualizadoEm: '2026-11-24T10:00:00-03:00' },
          { id: 2, atualizadoEm: '2026-11-25T09:00:00-03:00' },
        ],
        pagination: { nextCursor: null },
      });
      swl.listAtendimentos.mockResolvedValue({
        data: [atendimento({ atualizadoEm: '2026-11-25T11:00:00-03:00' })],
        pagination: { nextCursor: null },
      });

      await service.syncCompany('company-1', 'incremental');

      const updates = prisma.swlSyncState.upsert.mock.calls.map(
        (call) => call[0].update,
      );
      expect(updates).toEqual(
        expect.arrayContaining([
          { customersWatermark: new Date('2026-11-25T12:00:00.000Z') },
          { attendancesWatermark: new Date('2026-11-25T14:00:00.000Z') },
        ]),
      );
    });

    it('não avança o marco de clientes nem enfileira atendimentos se a paginação lançar', async () => {
      const { service, swl, prisma, saleQueue } = harness();
      prisma.swlSyncState.findUnique.mockResolvedValue({
        customersWatermark: new Date('2026-11-20T00:00:00.000Z'),
        deletionsWatermark: null,
        attendancesWatermark: new Date('2026-11-20T00:00:00.000Z'),
      });
      swl.listClientes.mockRejectedValue(new Error('timeout'));

      await expect(
        service.syncCompany('company-1', 'incremental'),
      ).rejects.toThrow('timeout');

      expect(prisma.swlSyncState.upsert).not.toHaveBeenCalled();
      expect(swl.listAtendimentos).not.toHaveBeenCalled();
      expect(saleQueue.add).not.toHaveBeenCalled();
    });

    it('incremental sem marco de atendimento roda como carga histórica', async () => {
      const { service, swl } = harness();

      await service.syncCompany('company-1', 'incremental');

      expect(swl.listAtendimentos.mock.calls[0][1]).toEqual(
        expect.objectContaining({ dataInicio: '2026-08-27' }),
      );
    });

    it('grava cliente e vínculo para cada cliente da lista', async () => {
      const { service, swl, customers, prisma } = harness();
      swl.listClientes.mockResolvedValue({
        data: [
          {
            id: 7,
            nome: 'Maria',
            celular: { original: '(11) 99999-0000', e164: '+5511999990000' },
            whatsappOptin: true,
            atualizadoEm: '2026-11-25T09:00:00-03:00',
          },
        ],
        pagination: { nextCursor: null },
      });
      customers.resolveForSale.mockResolvedValue({ id: 'customer-1' });

      await service.syncCompany('company-1', 'historical', {
        startDate: '2026-11-01',
        endDate: '2026-11-09',
      });

      const params = customers.resolveForSale.mock.calls[0][0];
      expect(params).toEqual({
        companyId: 'company-1',
        salesChannel: 'SWL',
        incoming: expect.objectContaining({
          name: 'Maria',
          phone: '+5511999990000',
        }),
      });
      expect(params.incoming).not.toHaveProperty('whatsappOptin');
      expect(prisma.swlCustomerLink.upsert).toHaveBeenCalledWith({
        where: {
          companyId_swlCustomerId: { companyId: 'company-1', swlCustomerId: 7 },
        },
        create: {
          companyId: 'company-1',
          swlCustomerId: 7,
          customerId: 'customer-1',
        },
        update: { customerId: 'customer-1' },
      });
    });

    it('cliente sem telefone e sem documento não ganha vínculo', async () => {
      const { service, swl, customers, prisma } = harness();
      swl.listClientes.mockResolvedValue({
        data: [{ id: 8, nome: 'Sem contato' }],
        pagination: { nextCursor: null },
      });
      customers.resolveForSale.mockResolvedValue(null);

      await service.syncCompany('company-1', 'historical', {
        startDate: '2026-11-01',
        endDate: '2026-11-09',
      });

      expect(prisma.swlCustomerLink.upsert).not.toHaveBeenCalled();
    });

    it('401 grava o hash do token, relança e não tenta de novo', async () => {
      const { service, swl, redis, saleQueue } = harness();
      swl.getLavanderia.mockRejectedValue(new SwlPermanentHttpError(401));

      await expect(
        service.syncCompany('company-1', 'incremental'),
      ).rejects.toBeInstanceOf(SwlPermanentHttpError);

      expect(redis.setJson).toHaveBeenCalledTimes(1);
      const [key, value, ttl] = redis.setJson.mock.calls[0];
      expect(key).toBe(swlAuthBlockKey('company-1'));
      expect(value).toBe(swlTokenHash(TOKEN));
      expect(JSON.stringify(value)).not.toContain(TOKEN);
      expect(ttl).toBeGreaterThan(12 * 60 * 60);
      expect(swl.getLavanderia).toHaveBeenCalledTimes(1);
      expect(saleQueue.add).not.toHaveBeenCalled();
    });

    it('403 também bloqueia, mas 400 não', async () => {
      const first = harness();
      first.swl.listClientes.mockRejectedValue(new SwlPermanentHttpError(403));
      await expect(
        first.service.syncCompany('company-1', 'incremental'),
      ).rejects.toBeInstanceOf(SwlPermanentHttpError);
      expect(first.redis.setJson).toHaveBeenCalledTimes(1);

      const second = harness();
      second.swl.listClientes.mockRejectedValue(new SwlPermanentHttpError(400));
      await expect(
        second.service.syncCompany('company-1', 'incremental'),
      ).rejects.toBeInstanceOf(SwlPermanentHttpError);
      expect(second.redis.setJson).not.toHaveBeenCalled();
    });
  });

  describe('exclusões', () => {
    async function exclude(h: ReturnType<typeof harness>) {
      h.swl.listExcluidos.mockResolvedValue({
        data: [{ id: 7, excluidoEm: '2026-11-25T09:00:00-03:00' }],
        pagination: { nextCursor: null },
      });
      await h.service.syncCompany('company-1', 'historical', {
        startDate: '2026-11-01',
        endDate: '2026-11-09',
      });
    }

    it('sem vínculo não faz nada', async () => {
      const h = harness();
      h.prisma.swlCustomerLink.findUnique.mockResolvedValue(null);

      await exclude(h);

      expect(h.prisma.$transaction).not.toHaveBeenCalled();
    });

    it('sem histórico apaga cliente, endereço exclusivo e vínculo', async () => {
      const h = harness();
      h.prisma.swlCustomerLink.findUnique.mockResolvedValue({
        id: 'link-1',
        customerId: 'customer-1',
      });
      h.prisma.swlCustomerLink.count.mockResolvedValue(0);
      h.prisma.customer.findUnique.mockResolvedValue({ addressId: 'address-1' });

      await exclude(h);

      expect(h.tx.swlCustomerLink.delete).toHaveBeenCalledWith({
        where: { id: 'link-1' },
      });
      expect(h.tx.customer.delete).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
      });
      expect(h.tx.address.deleteMany).toHaveBeenCalledWith({
        where: { id: 'address-1', company: { is: null } },
      });
    });

    it('com pedido mantém cliente e vínculo', async () => {
      const h = harness();
      h.prisma.swlCustomerLink.findUnique.mockResolvedValue({
        id: 'link-1',
        customerId: 'customer-1',
      });
      h.prisma.swlCustomerLink.count.mockResolvedValue(0);
      h.prisma.order.count.mockResolvedValue(2);

      await exclude(h);

      expect(h.prisma.$transaction).not.toHaveBeenCalled();
      expect(h.tx.customer.delete).not.toHaveBeenCalled();
    });

    it('com mensagem ou lista de envio mantém os dois', async () => {
      const withMessage = harness();
      withMessage.prisma.swlCustomerLink.findUnique.mockResolvedValue({
        id: 'link-1',
        customerId: 'customer-1',
      });
      withMessage.prisma.swlCustomerLink.count.mockResolvedValue(0);
      withMessage.prisma.message.count.mockResolvedValue(1);
      await exclude(withMessage);
      expect(withMessage.tx.customer.delete).not.toHaveBeenCalled();

      const withList = harness();
      withList.prisma.swlCustomerLink.findUnique.mockResolvedValue({
        id: 'link-1',
        customerId: 'customer-1',
      });
      withList.prisma.swlCustomerLink.count.mockResolvedValue(0);
      withList.prisma.customSendListMember.count.mockResolvedValue(1);
      await exclude(withList);
      expect(withList.tx.customer.delete).not.toHaveBeenCalled();
    });

    it('com segundo vínculo SWL remove só este vínculo', async () => {
      const h = harness();
      h.prisma.swlCustomerLink.findUnique.mockResolvedValue({
        id: 'link-1',
        customerId: 'customer-1',
      });
      h.prisma.swlCustomerLink.count.mockResolvedValue(1);

      await exclude(h);

      expect(h.prisma.swlCustomerLink.delete).toHaveBeenCalledWith({
        where: { id: 'link-1' },
      });
      expect(h.tx.customer.delete).not.toHaveBeenCalled();
      expect(h.tx.address.deleteMany).not.toHaveBeenCalled();
    });

    it('mantém os dois quando o banco recusa apagar o cliente', async () => {
      const h = harness();
      h.prisma.swlCustomerLink.findUnique.mockResolvedValue({
        id: 'link-1',
        customerId: 'customer-1',
      });
      h.prisma.swlCustomerLink.count.mockResolvedValue(0);
      h.prisma.customer.findUnique.mockResolvedValue({ addressId: null });
      h.tx.customer.delete.mockRejectedValue(
        Object.assign(new Error('fk'), { code: 'P2003' }),
      );

      await expect(exclude(h)).resolves.toBeUndefined();
    });
  });

  describe('processAttendance', () => {
    const existingOrder = {
      id: 'order-1',
      status: 'closed',
      customerId: 'customer-9',
    };

    it('PAGO cria o pedido com o cliente do vínculo', async () => {
      const { service, prisma, orders } = harness();
      prisma.swlCustomerLink.findUnique.mockResolvedValue({
        customerId: 'customer-1',
      });

      await service.processAttendance('company-1', atendimento(), {
        centroNome: 'Loja Centro',
      });

      expect(prisma.swlCustomerLink.findUnique).toHaveBeenCalledWith({
        where: {
          companyId_swlCustomerId: { companyId: 'company-1', swlCustomerId: 7 },
        },
      });
      expect(orders.findByExternalOrderId).toHaveBeenCalledWith(
        'company-1',
        'swl:10',
      );
      expect(orders.create).toHaveBeenCalledWith(
        expect.objectContaining({
          externalOrderId: 'swl:10',
          customerId: 'customer-1',
          status: 'closed',
          salesChannel: 'SWL',
          observation: 'SWL | Loja Centro',
        }),
      );
    });

    it('clienteId nulo grava o pedido sem cliente', async () => {
      const { service, prisma, orders } = harness();

      await service.processAttendance(
        'company-1',
        atendimento({ clienteId: null }),
      );

      expect(prisma.swlCustomerLink.findUnique).not.toHaveBeenCalled();
      expect(orders.create).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: null }),
      );
    });

    it('clienteId sem vínculo lança fora da última tentativa', async () => {
      const { service, prisma, orders } = harness();
      prisma.swlCustomerLink.findUnique.mockResolvedValue(null);

      await expect(
        service.processAttendance('company-1', atendimento()),
      ).rejects.toThrow('vínculo');

      expect(orders.create).not.toHaveBeenCalled();
    });

    it('clienteId sem vínculo grava sem cliente na última tentativa', async () => {
      const { service, prisma, orders } = harness();
      prisma.swlCustomerLink.findUnique.mockResolvedValue(null);

      const result = await service.processAttendance(
        'company-1',
        atendimento(),
        { lastAttempt: true },
      );

      expect(result).toEqual({ customerLinkMissing: true });
      expect(orders.create).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: null }),
      );
    });

    it('INATIVO com pedido existente reescreve como cancelled', async () => {
      const { service, orders, tx } = harness();
      orders.findByExternalOrderId.mockResolvedValue(existingOrder);

      await service.processAttendance(
        'company-1',
        atendimento({ situacao: 'INATIVO' }),
      );

      expect(orders.create).not.toHaveBeenCalled();
      expect(tx.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: expect.objectContaining({
          status: 'cancelled',
          cancellationReason: 'SWL INATIVO',
          customerId: 'customer-9',
        }),
      });
    });

    it('INATIVO sem pedido não cria', async () => {
      const { service, orders, tx, prisma } = harness();

      await service.processAttendance(
        'company-1',
        atendimento({ situacao: 'INATIVO' }),
      );

      expect(orders.create).not.toHaveBeenCalled();
      expect(tx.order.update).not.toHaveBeenCalled();
      expect(prisma.swlCustomerLink.findUnique).not.toHaveBeenCalled();
    });

    it('não pago sem pedido não cria', async () => {
      const { service, orders } = harness();

      await service.processAttendance(
        'company-1',
        atendimento({ status: { pagamento: 'EM_ABERTO', entrega: 'ESTOQUE' } }),
      );

      expect(orders.create).not.toHaveBeenCalled();
    });

    it('PAGO com pedido existente troca itens, pagamentos e descontos', async () => {
      const { service, prisma, orders, tx } = harness();
      orders.findByExternalOrderId.mockResolvedValue({
        ...existingOrder,
        status: 'cancelled',
      });
      prisma.swlCustomerLink.findUnique.mockResolvedValue({
        customerId: 'customer-1',
      });

      await service.processAttendance(
        'company-1',
        atendimento({
          valores: { liquido: '45.00', total: '50.00', descontoValor: '5.00' },
        }),
      );

      expect(tx.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: expect.objectContaining({
          status: 'closed',
          cancellationReason: null,
          customerId: 'customer-1',
          total: 45,
        }),
      });
      expect(tx.orderItem.deleteMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
      });
      expect(tx.orderPayment.deleteMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
      });
      expect(tx.orderDiscount.deleteMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
      });
      expect(tx.orderItem.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            orderId: 'order-1',
            name: 'Lavagem',
            externalCode: '1',
            quantity: 1,
          }),
        ],
      });
      expect(tx.orderPayment.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            orderId: 'order-1',
            total: 50,
            paymentMethod: 'PIX',
            status: 'paid',
          }),
        ],
      });
      expect(tx.orderDiscount.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            orderId: 'order-1',
            type: 'discount',
            value: 5,
          }),
        ],
      });
    });

    it('update sem pagamento PAGO mantém o status e não reabre pedido cancelado', async () => {
      const { service, orders, tx } = harness();
      orders.findByExternalOrderId.mockResolvedValue({
        ...existingOrder,
        status: 'cancelled',
      });

      await service.processAttendance(
        'company-1',
        atendimento({ status: { pagamento: 'PARCIAL', entrega: 'ESTOQUE' } }),
      );

      expect(tx.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: expect.objectContaining({ status: 'cancelled' }),
      });
      const data = tx.order.update.mock.calls[0][0].data;
      expect(data.cancellationReason).toBeUndefined();
    });

    it('conflito único de externalOrderId segue como já importado', async () => {
      const { service, prisma, orders } = harness();
      prisma.swlCustomerLink.findUnique.mockResolvedValue({
        customerId: 'customer-1',
      });
      orders.create.mockRejectedValue(
        Object.assign(new Error('unique'), {
          code: 'P2002',
          meta: { target: ['companyId', 'externalOrderId'] },
        }),
      );

      await expect(
        service.processAttendance('company-1', atendimento()),
      ).resolves.toBeUndefined();
    });

    it('conflito único de integratorOrderId também segue', async () => {
      const { service, prisma, orders } = harness();
      prisma.swlCustomerLink.findUnique.mockResolvedValue({
        customerId: 'customer-1',
      });
      orders.create.mockRejectedValue(
        Object.assign(new Error('unique'), {
          code: 'P2002',
          meta: { target: 'Order_companyId_integratorOrderId_key' },
        }),
      );

      await expect(
        service.processAttendance('company-1', atendimento()),
      ).resolves.toBeUndefined();
    });

    it('relança erro de gravação', async () => {
      const { service, prisma, orders } = harness();
      prisma.swlCustomerLink.findUnique.mockResolvedValue({
        customerId: 'customer-1',
      });
      orders.create.mockRejectedValue(new Error('db caiu'));

      await expect(
        service.processAttendance('company-1', atendimento()),
      ).rejects.toThrow('db caiu');
    });
  });

  describe('importHistoricalSales', () => {
    it('lança NotFound quando não há token', async () => {
      const { service, repository } = harness();
      repository.findByCompanyAndPartner.mockResolvedValue({ apiKey: '' });

      await expect(
        service.importHistoricalSales('company-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('enfileira a carga histórica com as datas informadas', async () => {
      const { service, importQueue } = harness();

      const result = await service.importHistoricalSales('company-1', {
        startDate: '2026-08-01',
        endDate: '2026-11-09',
      });

      expect(importQueue.add).toHaveBeenCalledWith(
        QUEUE_NAMES.SWL_SALES_IMPORT,
        {
          companyId: 'company-1',
          mode: 'historical',
          startDate: '2026-08-01',
          endDate: '2026-11-09',
        },
        expect.objectContaining({
          jobId: 'swl-historical:company-1:2026-08-01:2026-11-09',
          attempts: 3,
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          startDate: '2026-08-01',
          endDate: '2026-11-09',
          windows: 4,
          jobsCreated: 1,
        }),
      );
    });

    it('sem datas usa 90 dias e o id do backfill', async () => {
      const { service, importQueue } = harness();

      await service.importHistoricalSales('company-1');

      expect(importQueue.add).toHaveBeenCalledWith(
        QUEUE_NAMES.SWL_SALES_IMPORT,
        expect.objectContaining({
          companyId: 'company-1',
          mode: 'historical',
          startDate: '2026-08-27',
          endDate: '2026-11-25',
        }),
        expect.objectContaining({ jobId: 'swl-backfill-90:company-1' }),
      );
    });
  });
});
