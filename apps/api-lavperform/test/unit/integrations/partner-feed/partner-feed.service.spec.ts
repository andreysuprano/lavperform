import { PartnerFeedService } from 'src/integrations/partner-feed/partner-feed.service';
import { SessionRefreshError } from 'src/integrations/session-refresh/session-refresh.error';

const NOW = new Date('2026-11-23T18:00:00.000Z');

describe('PartnerFeedService', () => {
  function harness() {
    const prisma = {
      digitalMenuIntegration: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    const sessions = {
      currentAccessToken: jest.fn(),
      markReauth: jest.fn(),
    };
    const sales = { salesOfDay: jest.fn() };
    const ingestion = { enqueue: jest.fn() };
    const queue = {
      add: jest.fn().mockResolvedValue({}),
      getJob: jest.fn().mockResolvedValue(null),
    };
    const service = new PartnerFeedService(
      prisma as never,
      sessions as never,
      sales as never,
      ingestion as never,
      queue as never,
    );
    return { prisma, sessions, sales, ingestion, queue, service };
  }

  const integration = {
    id: 'integration-1',
    companyId: 'company-1',
    apiKey: 'token-legado',
    apiSecret: 'org-1',
    merchantId: 'loja-1',
    digitalMenuUrl: null,
    partner: { id: 'partner-1', partnerSlug: 'SISLAV', name: 'SisLav' },
  };

  const order = {
    externalOrderId: 'sale-1',
    customer: { name: 'Ana', phone: '11988887777' },
  };

  it('consulta o dia com o token da sessão e enfileira o pedido', async () => {
    const { prisma, sessions, sales, ingestion, service } = harness();
    prisma.digitalMenuIntegration.findMany.mockResolvedValue([integration]);
    sessions.currentAccessToken.mockResolvedValue('token-atual');
    sales.salesOfDay.mockResolvedValue([order]);

    await service.feedDue(NOW);

    expect(sessions.currentAccessToken).toHaveBeenCalledWith(
      'integration-1',
      'token-legado',
    );
    expect(sales.salesOfDay).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerSlug: 'SISLAV',
        accessToken: 'token-atual',
        date: '2026-11-23',
        merchantId: 'loja-1',
        organizationId: 'org-1',
      }),
    );
    expect(ingestion.enqueue).toHaveBeenCalledWith(
      { apiKeyId: 'partner-session-feed', companyId: 'company-1' },
      expect.objectContaining({
        externalOrderId: 'sale-1',
        partnerId: 'partner-1',
      }),
    );
  });

  it('não enfileira pedido sem telefone e sem CPF', async () => {
    const { prisma, sessions, sales, ingestion, service } = harness();
    prisma.digitalMenuIntegration.findMany.mockResolvedValue([integration]);
    sessions.currentAccessToken.mockResolvedValue('token-atual');
    sales.salesOfDay.mockResolvedValue([
      { externalOrderId: 'sem-contato', customer: { name: 'Ana' } },
    ]);

    await service.feedDue(NOW);

    expect(ingestion.enqueue).not.toHaveBeenCalled();
  });

  it('pede um token novo quando o parceiro recusa a sessão', async () => {
    const { prisma, sessions, sales, service } = harness();
    prisma.digitalMenuIntegration.findMany.mockResolvedValue([integration]);
    sessions.currentAccessToken.mockResolvedValue('token-atual');
    sales.salesOfDay.mockRejectedValue(
      new SessionRefreshError('token recusado', 'rejected'),
    );

    await service.feedDue(NOW);

    expect(sessions.markReauth).toHaveBeenCalledWith(
      'integration-1',
      'token recusado',
    );
  });

  it('enfileira um dia de histórico da Laundry Kit', async () => {
    const { prisma, sessions, queue, service } = harness();
    prisma.digitalMenuIntegration.findFirst.mockResolvedValue({
      ...integration,
      partner: { id: 'partner-2', partnerSlug: 'LAUNDRYKIT', name: 'Laundry Kit' },
    });
    sessions.currentAccessToken.mockResolvedValue('token-atual');

    const result = await service.importHistorical('company-1', {
      startDate: '2026-11-22',
      endDate: '2026-11-23',
    });

    expect(result.totalDays).toBe(2);
    expect(result.jobsCreated).toBe(2);
    expect(queue.add).toHaveBeenCalledTimes(2);
    expect(queue.add).toHaveBeenCalledWith(
      'laundrykit-sales-import',
      { companyId: 'company-1', date: '2026-11-22' },
      expect.objectContaining({
        jobId: 'laundrykit-import:company-1:2026-11-22',
      }),
    );
  });

  it('repete a consulta do dia quando o motor falha de forma transitória', async () => {
    const { prisma, sessions, sales, service } = harness();
    prisma.digitalMenuIntegration.findFirst.mockResolvedValue({
      ...integration,
      partner: { id: 'partner-2', partnerSlug: 'LAUNDRYKIT', name: 'Laundry Kit' },
    });
    sessions.currentAccessToken.mockResolvedValue('token-atual');
    sales.salesOfDay.mockRejectedValue(
      new SessionRefreshError('motor indisponível', 'transient'),
    );

    await expect(service.importDay('company-1', '2026-11-23')).rejects.toThrow(
      'motor indisponível',
    );
    expect(sessions.markReauth).not.toHaveBeenCalled();
  });
});
