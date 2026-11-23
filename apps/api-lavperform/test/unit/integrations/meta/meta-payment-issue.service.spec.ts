import { MetaPaymentIssueService } from 'src/integrations/meta/application/meta-payment-issue.service';

describe('MetaPaymentIssueService', () => {
  const prisma: any = {
    metaIntegration: {
      updateMany: jest.fn(),
    },
  };
  const service = new MetaPaymentIssueService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('abre a pendência no código 131042', async () => {
    prisma.metaIntegration.updateMany.mockResolvedValueOnce({ count: 1 });

    await service.report('co', { code: 131042, message: 'sem pagamento' });

    expect(prisma.metaIntegration.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'co', metaPaymentIssueAt: null },
        data: expect.objectContaining({ metaPaymentIssueCode: 131042 }),
      }),
    );
  });

  it('fecha só quando a mensagem foi enviada depois da pendência', async () => {
    prisma.metaIntegration.updateMany.mockResolvedValue({ count: 1 });
    const sentAt = new Date('2026-11-23T18:00:00.000Z');

    await service.resolveIfDelivered('co', sentAt);

    expect(prisma.metaIntegration.updateMany).toHaveBeenCalledWith({
      where: { companyId: 'co', metaPaymentIssueAt: { lt: sentAt } },
      data: {
        metaPaymentIssueAt: null,
        metaPaymentIssueCode: null,
        metaPaymentIssueMessage: null,
      },
    });
  });
});
