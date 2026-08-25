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
  let customerIdentityService: {
    resolveForSale: jest.Mock;
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
    customerIdentityService = {
      resolveForSale: jest.fn().mockResolvedValue({
        id: 'cust-1',
        name: 'João Silva',
        phone: '5541997269435',
      }),
    };

    processor = new OrderIngestionProcessor(
      orderService as any,
      customerIdentityService as any,
    );
  });

  it('resolve o cliente e cria o pedido', async () => {
    const job = buildJob({
      customer: { name: 'João Silva', phone: '41997269435' },
    });

    const result = await processor.handle(job);

    expect(customerIdentityService.resolveForSale).toHaveBeenCalledWith({
      companyId: 'company-1',
      incoming: { name: 'João Silva', phone: '41997269435' },
      salesChannel: undefined,
      partner: undefined,
    });
    expect(orderService.create).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'cust-1' }),
    );
    expect(result).toEqual({ orderId: 'order-1' });
  });

  it('ignora pedido ja recebido', async () => {
    orderService.findByExternalOrderId.mockResolvedValue({ id: 'order-existing' });

    const job = buildJob({
      customer: { name: 'João', phone: '41997269435' },
    });

    const result = await processor.handle(job);

    expect(result).toEqual({ skipped: true, orderId: 'order-existing' });
    expect(customerIdentityService.resolveForSale).not.toHaveBeenCalled();
    expect(orderService.create).not.toHaveBeenCalled();
  });

  it('usa o nome correto do job', () => {
    expect(PUBLIC_API_ORDER_INGESTION_JOB).toBe('ingest-order');
  });
});
