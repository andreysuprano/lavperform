import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { OrderIngestionService } from 'src/public-api/orders/application/order-ingestion.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';

describe('OrderIngestionService', () => {
  let service: OrderIngestionService;

  const mockPrisma = {
    order: {
      findUnique: jest.fn(),
    },
    partner: {
      findUnique: jest.fn(),
    },
  };

  const mockQueue = {
    add: jest.fn(),
  };

  const ctx = {
    apiKeyId: 'key-1',
    companyId: 'company-1',
  };

  const payload = {
    externalOrderId: 'order-123',
    displayId: 1,
    status: 'closed',
    orderType: 'delivery',
    orderTiming: 'instant',
    deliveryFee: 0,
    serviceFee: 0,
    additionalFee: 0,
    total: 10,
    customer: { name: 'João', phone: '41999999999' },
    createdAt: '2026-06-18T18:30:00.000Z',
    updatedAt: '2026-06-18T18:30:00.000Z',
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderIngestionService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: getQueueToken(QUEUE_NAMES.PUBLIC_API_ORDER_INGESTION),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get(OrderIngestionService);
    jest.clearAllMocks();
  });

  it('retorna already_received quando pedido já existe', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({ id: 'order-db-1' });

    const result = await service.enqueue(ctx, payload);

    expect(result).toEqual({
      status: 'already_received',
      externalOrderId: 'order-123',
      orderId: 'order-db-1',
    });
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  it('enfileira pedido novo', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);
    mockQueue.add.mockResolvedValue({ id: 'job-1' });

    const result = await service.enqueue(ctx, payload);

    expect(result).toEqual({
      status: 'queued',
      jobId: 'job-1',
      externalOrderId: 'order-123',
    });
    expect(mockQueue.add).toHaveBeenCalledWith(
      'ingest-order',
      { ctx, payload, partner: undefined },
      expect.objectContaining({
        jobId: 'company-1:order-123',
        attempts: 5,
      }),
    );
  });

  it('enfileira pedido com partnerId válido', async () => {
    const payloadWithPartner = {
      ...payload,
      partnerId: 'partner-1',
    };
    mockPrisma.order.findUnique.mockResolvedValue(null);
    mockPrisma.partner.findUnique.mockResolvedValue({
      id: 'partner-1',
      partnerSlug: 'ifood',
      name: 'iFood',
    });
    mockQueue.add.mockResolvedValue({ id: 'job-1' });

    await service.enqueue(ctx, payloadWithPartner);

    expect(mockQueue.add).toHaveBeenCalledWith(
      'ingest-order',
      {
        ctx,
        payload: payloadWithPartner,
        partner: { id: 'partner-1', partnerSlug: 'ifood', name: 'iFood' },
      },
      expect.any(Object),
    );
  });

  it('rejeita partnerId inválido', async () => {
    mockPrisma.partner.findUnique.mockResolvedValue(null);

    await expect(
      service.enqueue(ctx, {
        ...payload,
        partnerId: '00000000-0000-0000-0000-000000000000',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('propaga indisponibilidade da fila', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);
    mockQueue.add.mockRejectedValue(new Error('Redis down'));

    await expect(service.enqueue(ctx, payload)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
