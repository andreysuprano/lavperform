/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { BadRequestException } from '@nestjs/common';
import {
  CreditLedgerEntryType,
  CreditPaymentMethod,
  CreditTopupStatus,
} from '@prisma/client';
import { CreditsService } from 'src/credits/application/credits.service';

describe('CreditsService', () => {
  const asaasService = {
    createCustomer: jest.fn(),
    createPayment: jest.fn(),
  };
  const queue = {
    add: jest.fn(),
  };

  let prisma: any;
  let service: CreditsService;

  beforeEach(() => {
    prisma = {
      creditTopup: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      companyCreditWallet: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        updateMany: jest.fn(),
      },
      creditProduct: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      defaultCreditProduct: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      creditLedgerEntry: {
        create: jest.fn(),
      },
      company: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((callback: (tx: any) => Promise<unknown>) =>
        callback(prisma),
      ),
    };

    service = new CreditsService(prisma, asaasService as any, queue as any);
    jest.clearAllMocks();
  });

  it('cria oferta default normalizando o código', async () => {
    prisma.defaultCreditProduct.findUnique.mockResolvedValue(null);
    prisma.defaultCreditProduct.create.mockResolvedValue({
      id: 'default-1',
      code: 'MSG',
    });

    await service.createDefaultProduct({
      name: 'Mensagem',
      code: ' msg ',
      priceCents: 100,
    });

    expect(prisma.defaultCreditProduct.create).toHaveBeenCalledWith({
      data: {
        name: 'Mensagem',
        code: 'MSG',
        description: null,
        priceCents: 100,
        active: true,
      },
    });
  });

  it('bloqueia oferta default duplicada por código', async () => {
    prisma.defaultCreditProduct.findUnique.mockResolvedValue({
      id: 'default-1',
      code: 'MSG',
    });

    await expect(
      service.createDefaultProduct({
        name: 'Mensagem',
        code: 'MSG',
        priceCents: 100,
      }),
    ).rejects.toThrow(/oferta default/);
  });

  it('aplica recarga paga e registra ledger uma única vez', async () => {
    const topup = {
      id: 'topup-1',
      companyId: 'company-1',
      status: CreditTopupStatus.PENDING,
      amountCents: 5000,
      paymentMethod: CreditPaymentMethod.PIX,
    };
    prisma.creditTopup.findFirst
      .mockResolvedValueOnce(topup)
      .mockResolvedValueOnce({ ...topup, status: CreditTopupStatus.PAID });
    prisma.creditTopup.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    prisma.companyCreditWallet.upsert = jest.fn().mockResolvedValue({
      companyId: 'company-1',
      balanceCents: 5000,
    });
    prisma.creditLedgerEntry.create.mockResolvedValue({ id: 'ledger-1' });
    prisma.creditTopup.findUniqueOrThrow = jest.fn().mockResolvedValue({
      ...topup,
      status: CreditTopupStatus.PAID,
    });

    const result = await service.updateTopupStatus('company-1', 'topup-1', {
      status: CreditTopupStatus.PAID,
    });

    expect(prisma.companyCreditWallet.upsert).toHaveBeenCalledWith({
      where: { companyId: 'company-1' },
      create: { companyId: 'company-1', balanceCents: 5000 },
      update: { balanceCents: { increment: 5000 } },
    });
    expect(prisma.creditLedgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: 'company-1',
        topupId: 'topup-1',
        type: CreditLedgerEntryType.TOPUP,
        amountCents: 5000,
        balanceAfterCents: 5000,
      }),
    });
    expect(result.status).toBe(CreditTopupStatus.PAID);
  });

  it('não duplica créditos quando a recarga já está paga', async () => {
    const topup = {
      id: 'topup-1',
      companyId: 'company-1',
      status: CreditTopupStatus.PAID,
      amountCents: 5000,
    };
    prisma.creditTopup.findFirst.mockResolvedValue(topup);
    prisma.creditTopup.updateMany = jest.fn().mockResolvedValue({ count: 0 });
    prisma.companyCreditWallet.upsert = jest.fn();

    const result = await service.updateTopupStatus('company-1', 'topup-1', {
      status: CreditTopupStatus.PAID,
    });

    expect(prisma.companyCreditWallet.upsert).not.toHaveBeenCalled();
    expect(prisma.creditLedgerEntry.create).not.toHaveBeenCalled();
    expect(result).toEqual(topup);
  });

  it('bloqueia consumo quando o saldo é insuficiente', async () => {
    prisma.creditProduct.findFirst.mockResolvedValue({
      id: 'product-1',
      companyId: 'company-1',
      code: 'MSG',
      priceCents: 200,
      active: true,
    });
    prisma.companyCreditWallet.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.consumeCredits({
        companyId: 'company-1',
        productCode: 'msg',
        metadata: { source: 'test' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.companyCreditWallet.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(prisma.creditLedgerEntry.create).not.toHaveBeenCalled();
  });

  it('desconta créditos e armazena metadata do consumo', async () => {
    prisma.creditProduct.findFirst.mockResolvedValue({
      id: 'product-1',
      companyId: 'company-1',
      code: 'MSG',
      priceCents: 200,
      active: true,
    });
    prisma.companyCreditWallet.updateMany.mockResolvedValue({ count: 1 });
    prisma.companyCreditWallet.findUniqueOrThrow.mockResolvedValue({
      companyId: 'company-1',
      balanceCents: 800,
    });
    prisma.creditLedgerEntry.create.mockResolvedValue({ id: 'ledger-1' });

    await service.consumeCredits({
      companyId: 'company-1',
      productCode: 'msg',
      metadata: { orderId: 'order-1' },
    });

    expect(prisma.creditLedgerEntry.create).toHaveBeenCalledWith({
      data: {
        companyId: 'company-1',
        productId: 'product-1',
        defaultProductId: undefined,
        type: CreditLedgerEntryType.CONSUMPTION,
        amountCents: -200,
        balanceAfterCents: 800,
        metadata: { orderId: 'order-1' },
      },
    });
  });

  it('usa oferta default no consumo quando não existe produto personalizado', async () => {
    prisma.creditProduct.findFirst.mockResolvedValue(null);
    prisma.defaultCreditProduct.findFirst.mockResolvedValue({
      id: 'default-1',
      code: 'MSG',
      priceCents: 150,
      active: true,
    });
    prisma.companyCreditWallet.updateMany.mockResolvedValue({ count: 1 });
    prisma.companyCreditWallet.findUniqueOrThrow.mockResolvedValue({
      companyId: 'company-1',
      balanceCents: 850,
    });
    prisma.creditLedgerEntry.create.mockResolvedValue({ id: 'ledger-1' });

    await service.consumeCredits({
      companyId: 'company-1',
      productCode: 'msg',
      metadata: { orderId: 'order-1' },
    });

    expect(prisma.creditLedgerEntry.create).toHaveBeenCalledWith({
      data: {
        companyId: 'company-1',
        productId: undefined,
        defaultProductId: 'default-1',
        type: CreditLedgerEntryType.CONSUMPTION,
        amountCents: -150,
        balanceAfterCents: 850,
        metadata: { orderId: 'order-1' },
      },
    });
  });

  it('lista produtos efetivos priorizando personalizados por código', async () => {
    prisma.company.findUnique.mockResolvedValue({
      id: 'company-1',
      address: null,
    });
    prisma.creditProduct.findMany.mockResolvedValue([
      {
        id: 'product-1',
        name: 'Mensagem custom',
        code: 'MSG',
        description: null,
        priceCents: 200,
        active: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
      },
    ]);
    prisma.defaultCreditProduct.findMany.mockResolvedValue([
      {
        id: 'default-1',
        name: 'Mensagem default',
        code: 'MSG',
        description: null,
        priceCents: 150,
        active: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
      },
      {
        id: 'default-2',
        name: 'IA',
        code: 'AI',
        description: null,
        priceCents: 500,
        active: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
      },
    ]);

    const result = await service.findEffectiveProducts(
      'company-1',
      { page: 1, limit: 10 },
      {},
    );

    expect(result.data).toEqual([
      expect.objectContaining({
        code: 'AI',
        source: 'DEFAULT',
        defaultProductId: 'default-2',
      }),
      expect.objectContaining({
        code: 'MSG',
        source: 'CUSTOM',
        productId: 'product-1',
      }),
    ]);
  });

  it('rejeita recarga paga com método PLATFORM', async () => {
    await expect(
      service.createTopup('company-1', {
        paymentMethod: CreditPaymentMethod.PLATFORM,
        amountCents: 5000,
      }),
    ).rejects.toThrow(/concessão/);
  });

  it('concede créditos da plataforma e registra ledger com metadata', async () => {
    prisma.company.findUnique.mockResolvedValue({
      id: 'company-1',
      address: null,
    });
    prisma.creditTopup.create.mockResolvedValue({
      id: 'topup-platform-1',
      companyId: 'company-1',
      paymentMethod: CreditPaymentMethod.PLATFORM,
      status: CreditTopupStatus.PENDING,
      amountCents: 10000,
    });
    prisma.creditTopup.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    prisma.creditTopup.findFirst.mockResolvedValue({
      id: 'topup-platform-1',
      companyId: 'company-1',
      paymentMethod: CreditPaymentMethod.PLATFORM,
      status: CreditTopupStatus.PENDING,
      amountCents: 10000,
    });
    prisma.companyCreditWallet.upsert = jest.fn().mockResolvedValue({
      companyId: 'company-1',
      balanceCents: 10000,
    });
    prisma.creditLedgerEntry.create.mockResolvedValue({ id: 'ledger-1' });
    prisma.creditTopup.findUniqueOrThrow = jest.fn().mockResolvedValue({
      id: 'topup-platform-1',
      companyId: 'company-1',
      paymentMethod: CreditPaymentMethod.PLATFORM,
      status: CreditTopupStatus.PAID,
      amountCents: 10000,
    });

    const result = await service.grantPlatformCredits(
      'company-1',
      { amountCents: 10000, reason: 'Bônus' },
      { adminUserId: 'admin-1', adminUserName: 'Admin Teste' },
    );

    expect(prisma.creditTopup.create).toHaveBeenCalledWith({
      data: {
        companyId: 'company-1',
        paymentMethod: CreditPaymentMethod.PLATFORM,
        amountCents: 10000,
        status: CreditTopupStatus.PENDING,
      },
    });
    expect(prisma.creditLedgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: 'company-1',
        topupId: 'topup-platform-1',
        type: CreditLedgerEntryType.TOPUP,
        amountCents: 10000,
        balanceAfterCents: 10000,
        metadata: expect.objectContaining({
          source: 'platform-voucher',
          reason: 'Bônus',
          grantedByAdminUserId: 'admin-1',
          grantedByAdminUserName: 'Admin Teste',
        }),
      }),
    });
    expect(result.status).toBe(CreditTopupStatus.PAID);
  });

  it('bloqueia alteração manual de status em voucher da plataforma', async () => {
    prisma.creditTopup.findFirst.mockResolvedValue({
      id: 'topup-platform-1',
      companyId: 'company-1',
      paymentMethod: CreditPaymentMethod.PLATFORM,
      status: CreditTopupStatus.PAID,
      amountCents: 10000,
    });

    await expect(
      service.updateTopupStatus('company-1', 'topup-platform-1', {
        status: CreditTopupStatus.CANCELED,
      }),
    ).rejects.toThrow(/Vouchers da plataforma/);
  });
});
