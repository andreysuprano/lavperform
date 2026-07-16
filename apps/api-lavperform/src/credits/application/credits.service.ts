import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import {
  CreditLedgerEntryType,
  CreditPaymentMethod,
  CreditTopupStatus,
  Prisma,
} from '@prisma/client';
import type { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AsaasService } from '../../integrations/asaas/api/asaas.service';
import { CreateCreditProductDto } from './dto/create-credit-product.dto';
import { UpdateCreditProductDto } from './dto/update-credit-product.dto';
import { CreditProductFilterDto } from './dto/credit-product-filter.dto';
import { CreateCreditTopupDto } from './dto/create-credit-topup.dto';
import {
  CreateCreditGrantDto,
  CreditGrantAdminContext,
} from './dto/create-credit-grant.dto';
import { CreditTopupFilterDto } from './dto/credit-topup-filter.dto';
import { UpdateCreditTopupStatusDto } from './dto/update-credit-topup-status.dto';
import { CreditLedgerFilterDto } from './dto/credit-ledger-filter.dto';
import { CreditsConsumeRequestedPayload } from '../domain/credits.events';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { ASAAS_PAYMENT_PROCESS_JOB_NAME } from './credits.constants';

type CompanyWithAddress = Prisma.CompanyGetPayload<{
  include: { address: true };
}>;

type EffectiveCreditProduct = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  priceCents: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  source: 'CUSTOM' | 'DEFAULT';
  productId: string | null;
  defaultProductId: string | null;
};

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaasService: AsaasService,
    @InjectQueue(QUEUE_NAMES.ASAAS_PAYMENT_PROCESS)
    private readonly asaasPaymentQueue: Queue,
  ) {}

  async createProduct(companyId: string, dto: CreateCreditProductDto) {
    await this.ensureCompany(companyId);
    const code = this.normalizeProductCode(dto.code);

    const existing = await this.prisma.creditProduct.findUnique({
      where: { companyId_code: { companyId, code } },
    });
    if (existing) {
      throw new ConflictException(
        'Já existe um produto com este código para esta empresa',
      );
    }

    return this.prisma.creditProduct.create({
      data: {
        companyId,
        name: dto.name.trim(),
        code,
        description: dto.description ?? null,
        priceCents: dto.priceCents,
        active: dto.active ?? true,
      },
    });
  }

  async findProducts(
    companyId: string,
    pagination: PaginationDto,
    filter: CreditProductFilterDto,
  ) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    const where: Prisma.CreditProductWhereInput = {
      companyId,
      ...(filter.includeDeleted ? {} : { deletedAt: null }),
      ...(filter.active !== undefined ? { active: filter.active } : {}),
      ...(filter.search
        ? {
            OR: [
              { name: { contains: filter.search, mode: 'insensitive' } },
              { code: { contains: filter.search, mode: 'insensitive' } },
              { description: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.creditProduct.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.resolveOrderBy(pagination, [
          'createdAt',
          'updatedAt',
          'name',
          'code',
          'priceCents',
        ]),
      }),
      this.prisma.creditProduct.count({ where }),
    ]);

    return this.paginated(items, total, page, limit);
  }

  async findProduct(companyId: string, id: string) {
    const product = await this.prisma.creditProduct.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException('Produto de crédito não encontrado');
    }
    return product;
  }

  async updateProduct(
    companyId: string,
    id: string,
    dto: UpdateCreditProductDto,
  ) {
    await this.findProduct(companyId, id);
    const data: Prisma.CreditProductUncheckedUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.priceCents !== undefined) data.priceCents = dto.priceCents;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.code !== undefined) {
      const code = this.normalizeProductCode(dto.code);
      const existing = await this.prisma.creditProduct.findUnique({
        where: { companyId_code: { companyId, code } },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          'Já existe outro produto com este código para esta empresa',
        );
      }
      data.code = code;
    }

    return this.prisma.creditProduct.update({ where: { id }, data });
  }

  async toggleProductActive(companyId: string, id: string) {
    const product = await this.findProduct(companyId, id);
    return this.prisma.creditProduct.update({
      where: { id },
      data: { active: !product.active },
    });
  }

  async removeProduct(companyId: string, id: string) {
    await this.findProduct(companyId, id);
    return this.prisma.creditProduct.update({
      where: { id },
      data: { active: false, deletedAt: new Date() },
    });
  }

  async restoreProduct(companyId: string, id: string) {
    const product = await this.prisma.creditProduct.findFirst({
      where: { id, companyId },
    });
    if (!product) {
      throw new NotFoundException('Produto de crédito não encontrado');
    }
    return this.prisma.creditProduct.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async createDefaultProduct(dto: CreateCreditProductDto) {
    const code = this.normalizeProductCode(dto.code);
    const existing = await this.prisma.defaultCreditProduct.findUnique({
      where: { code },
    });
    if (existing) {
      throw new ConflictException(
        'Já existe uma oferta default com este código',
      );
    }

    return this.prisma.defaultCreditProduct.create({
      data: {
        name: dto.name.trim(),
        code,
        description: dto.description ?? null,
        priceCents: dto.priceCents,
        active: dto.active ?? true,
      },
    });
  }

  async findDefaultProducts(filter: CreditProductFilterDto) {
    const where: Prisma.DefaultCreditProductWhereInput = {
      ...(filter.includeDeleted ? {} : { deletedAt: null }),
      ...(filter.active !== undefined ? { active: filter.active } : {}),
      ...(filter.search
        ? {
            OR: [
              { name: { contains: filter.search, mode: 'insensitive' } },
              { code: { contains: filter.search, mode: 'insensitive' } },
              { description: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.defaultCreditProduct.findMany({
      where,
      orderBy: { code: 'asc' },
    });
  }

  async findDefaultProduct(id: string) {
    const product = await this.prisma.defaultCreditProduct.findFirst({
      where: { id, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException('Oferta default de crédito não encontrada');
    }
    return product;
  }

  async updateDefaultProduct(id: string, dto: UpdateCreditProductDto) {
    await this.findDefaultProduct(id);
    const data: Prisma.DefaultCreditProductUncheckedUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.priceCents !== undefined) data.priceCents = dto.priceCents;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.code !== undefined) {
      const code = this.normalizeProductCode(dto.code);
      const existing = await this.prisma.defaultCreditProduct.findUnique({
        where: { code },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          'Já existe outra oferta default com este código',
        );
      }
      data.code = code;
    }

    return this.prisma.defaultCreditProduct.update({ where: { id }, data });
  }

  async toggleDefaultProductActive(id: string) {
    const product = await this.findDefaultProduct(id);
    return this.prisma.defaultCreditProduct.update({
      where: { id },
      data: { active: !product.active },
    });
  }

  async removeDefaultProduct(id: string) {
    await this.findDefaultProduct(id);
    return this.prisma.defaultCreditProduct.update({
      where: { id },
      data: { active: false, deletedAt: new Date() },
    });
  }

  async restoreDefaultProduct(id: string) {
    const product = await this.prisma.defaultCreditProduct.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException('Oferta default de crédito não encontrada');
    }
    return this.prisma.defaultCreditProduct.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async findEffectiveProducts(
    companyId: string,
    pagination: PaginationDto,
    filter: CreditProductFilterDto,
  ) {
    await this.ensureCompany(companyId);
    const customWhere: Prisma.CreditProductWhereInput = {
      companyId,
      deletedAt: null,
      active: filter.active ?? true,
      ...(filter.search
        ? {
            OR: [
              { name: { contains: filter.search, mode: 'insensitive' } },
              { code: { contains: filter.search, mode: 'insensitive' } },
              { description: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const defaultWhere: Prisma.DefaultCreditProductWhereInput = {
      deletedAt: null,
      active: filter.active ?? true,
      ...(filter.search
        ? {
            OR: [
              { name: { contains: filter.search, mode: 'insensitive' } },
              { code: { contains: filter.search, mode: 'insensitive' } },
              { description: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [customProducts, defaultProducts] = await Promise.all([
      this.prisma.creditProduct.findMany({ where: customWhere }),
      this.prisma.defaultCreditProduct.findMany({ where: defaultWhere }),
    ]);

    const customByCode = new Map(
      customProducts.map((product) => [product.code, product]),
    );
    const customItems: EffectiveCreditProduct[] = customProducts.map(
      (product) => ({
        id: product.id,
        name: product.name,
        code: product.code,
        description: product.description,
        priceCents: product.priceCents,
        active: product.active,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        deletedAt: product.deletedAt,
        source: 'CUSTOM',
        productId: product.id,
        defaultProductId: null,
      }),
    );
    const defaultItems: EffectiveCreditProduct[] = defaultProducts
      .filter((product) => !customByCode.has(product.code))
      .map((product) => ({
        id: product.id,
        name: product.name,
        code: product.code,
        description: product.description,
        priceCents: product.priceCents,
        active: product.active,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        deletedAt: product.deletedAt,
        source: 'DEFAULT',
        productId: null,
        defaultProductId: product.id,
      }));

    const items = [...customItems, ...defaultItems].sort((a, b) =>
      a.code.localeCompare(b.code),
    );
    const { page = 1, limit = 10 } = pagination;
    const start = (page - 1) * limit;
    return this.paginated(
      items.slice(start, start + limit),
      items.length,
      page,
      limit,
    );
  }

  async createTopup(companyId: string, dto: CreateCreditTopupDto) {
    if (dto.paymentMethod === CreditPaymentMethod.PLATFORM) {
      throw new BadRequestException(
        'Use o endpoint de concessão para créditos da plataforma',
      );
    }

    const company = await this.ensureCompany(companyId);
    const asaasCustomerId = await this.resolveAsaasCustomerId(company);
    const asaasPayment = await this.asaasService.createPayment({
      customer: asaasCustomerId,
      billingType: this.toAsaasBillingType(dto.paymentMethod),
      value: dto.amountCents / 100,
      dueDate: new Date().toISOString().slice(0, 10),
      description: `Recarga de créditos - ${company.name}`,
    });

    const topup = await this.prisma.creditTopup.create({
      data: {
        companyId,
        paymentMethod: dto.paymentMethod,
        amountCents: dto.amountCents,
        status: CreditTopupStatus.PENDING,
        asaasChargeId: asaasPayment.id,
        rawPaymentPayload: asaasPayment as Prisma.InputJsonValue,
      },
    });

    return { ...topup, asaasPayment };
  }

  async grantPlatformCredits(
    companyId: string,
    dto: CreateCreditGrantDto,
    adminContext?: CreditGrantAdminContext,
  ) {
    await this.ensureCompany(companyId);

    const ledgerMetadata: Record<string, unknown> = {
      source: 'platform-voucher',
      ...(dto.reason ? { reason: dto.reason } : {}),
      ...(adminContext
        ? {
            grantedByAdminUserId: adminContext.adminUserId,
            grantedByAdminUserName: adminContext.adminUserName,
          }
        : {}),
    };

    const topup = await this.prisma.creditTopup.create({
      data: {
        companyId,
        paymentMethod: CreditPaymentMethod.PLATFORM,
        amountCents: dto.amountCents,
        status: CreditTopupStatus.PENDING,
      },
    });

    return this.applyPaidTopupById(
      companyId,
      topup.id,
      undefined,
      new Date(),
      ledgerMetadata,
    );
  }

  async findTopups(
    companyId: string,
    pagination: PaginationDto,
    filter: CreditTopupFilterDto,
  ) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    const where: Prisma.CreditTopupWhereInput = {
      companyId,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.paymentMethod ? { paymentMethod: filter.paymentMethod } : {}),
      ...this.createdAtFilter(filter.startDate, filter.endDate),
    };

    const [items, total] = await Promise.all([
      this.prisma.creditTopup.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.resolveOrderBy(pagination, [
          'createdAt',
          'updatedAt',
          'amountCents',
          'status',
        ]),
      }),
      this.prisma.creditTopup.count({ where }),
    ]);

    return this.paginated(items, total, page, limit);
  }

  async findTopup(companyId: string, id: string) {
    const topup = await this.prisma.creditTopup.findFirst({
      where: { id, companyId },
    });
    if (!topup) {
      throw new NotFoundException('Recarga não encontrada');
    }
    return topup;
  }

  async updateTopupStatus(
    companyId: string,
    id: string,
    dto: UpdateCreditTopupStatusDto,
  ) {
    const topup = await this.findTopup(companyId, id);
    if (topup.paymentMethod === CreditPaymentMethod.PLATFORM) {
      throw new BadRequestException(
        'Vouchers da plataforma não permitem alteração manual de status',
      );
    }
    if (
      topup.status === CreditTopupStatus.PAID &&
      dto.status !== CreditTopupStatus.PAID
    ) {
      throw new BadRequestException('Não é possível reverter uma recarga paga');
    }
    if (dto.status === CreditTopupStatus.PAID) {
      return this.applyPaidTopupById(
        companyId,
        id,
        undefined,
        dto.paidAt ? new Date(dto.paidAt) : undefined,
      );
    }
    return this.prisma.creditTopup.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async getBalance(companyId: string) {
    await this.ensureCompany(companyId);
    const wallet = await this.prisma.companyCreditWallet.upsert({
      where: { companyId },
      create: { companyId },
      update: {},
    });
    return wallet;
  }

  async findLedgerEntries(
    companyId: string,
    pagination: PaginationDto,
    filter: CreditLedgerFilterDto,
  ) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    const where: Prisma.CreditLedgerEntryWhereInput = {
      companyId,
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.productId ? { productId: filter.productId } : {}),
      ...this.createdAtFilter(filter.startDate, filter.endDate),
    };

    const [items, total] = await Promise.all([
      this.prisma.creditLedgerEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.resolveOrderBy(pagination, [
          'createdAt',
          'amountCents',
          'balanceAfterCents',
        ]),
        include: {
          product: true,
          defaultProduct: true,
          topup: true,
        },
      }),
      this.prisma.creditLedgerEntry.count({ where }),
    ]);

    return this.paginated(items, total, page, limit);
  }

  async consumeCredits(payload: CreditsConsumeRequestedPayload) {
    if (!payload.productId && !payload.productCode) {
      throw new BadRequestException(
        'Informe productId ou productCode para consumir créditos',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const productCode = payload.productCode
        ? this.normalizeProductCode(payload.productCode)
        : undefined;
      const product = await tx.creditProduct.findFirst({
        where: {
          companyId: payload.companyId,
          active: true,
          deletedAt: null,
          ...(payload.productId
            ? { id: payload.productId }
            : { code: productCode }),
        },
      });

      const defaultProduct =
        !product && !payload.productId && productCode
          ? await tx.defaultCreditProduct.findFirst({
              where: {
                code: productCode,
                active: true,
                deletedAt: null,
              },
            })
          : null;
      const resolvedProduct = product ?? defaultProduct;

      if (!resolvedProduct) {
        throw new NotFoundException('Produto de crédito ativo não encontrado');
      }

      const debited = await tx.companyCreditWallet.updateMany({
        where: {
          companyId: payload.companyId,
          balanceCents: { gte: resolvedProduct.priceCents },
        },
        data: { balanceCents: { decrement: resolvedProduct.priceCents } },
      });
      if (debited.count === 0) {
        throw new BadRequestException('Saldo de créditos insuficiente');
      }

      const updatedWallet = await tx.companyCreditWallet.findUniqueOrThrow({
        where: { companyId: payload.companyId },
      });

      return tx.creditLedgerEntry.create({
        data: {
          companyId: payload.companyId,
          productId: product?.id,
          defaultProductId: defaultProduct?.id,
          type: CreditLedgerEntryType.CONSUMPTION,
          amountCents: -resolvedProduct.priceCents,
          balanceAfterCents: updatedWallet.balanceCents,
          metadata: (payload.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
    });
  }

  async receiveAsaasWebhook(payload: Record<string, unknown>) {
    await this.asaasPaymentQueue.add(
      ASAAS_PAYMENT_PROCESS_JOB_NAME,
      { payload },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async processAsaasPaymentWebhook(payload: Record<string, unknown>) {
    const payment = this.extractAsaasPayment(payload);
    const asaasChargeId = this.getString(payment.id);
    if (!asaasChargeId) {
      this.logger.warn('Webhook Asaas sem payment.id; payload ignorado');
      return;
    }

    const status = this.mapAsaasTopupStatus(
      this.getString(payload.event),
      this.getString(payment.status),
    );
    if (!status) {
      this.logger.log(`Webhook Asaas ignorado para cobrança ${asaasChargeId}`);
      return;
    }

    if (status === CreditTopupStatus.PAID) {
      await this.applyPaidTopupByAsaasChargeId(asaasChargeId, payload);
      return;
    }

    await this.updateTopupByAsaasChargeId(asaasChargeId, status, payload);
  }

  async recoverTopupFromAsaas(companyId: string, asaasChargeId: string) {
    const company = await this.ensureCompany(companyId);

    const existing = await this.prisma.creditTopup.findUnique({
      where: { asaasChargeId },
    });

    if (existing && existing.status === CreditTopupStatus.PAID) {
      this.logger.log(`Recarga ${existing.id} já está paga. Nada a fazer.`);
      return existing;
    }

    const asaasPayment = await this.asaasService.getPaymentDetails(asaasChargeId);

    if (!asaasPayment?.id) {
      throw new NotFoundException(
        `Cobrança ${asaasChargeId} não encontrada no Asaas`,
      );
    }

    const isPaid = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(
      ((asaasPayment.status as string) ?? '').toUpperCase(),
    );

    if (existing) {
      this.logger.log(
        `Recarga ${existing.id} encontrada (status=${existing.status}); isPaid=${isPaid}`,
      );
      if (isPaid) {
        return this.applyPaidTopupById(
          companyId,
          existing.id,
          asaasPayment as Record<string, unknown>,
        );
      }
      return existing;
    }

    // Sem CreditTopup local: só permite criar a recarga se a cobrança no Asaas
    // for avulsa. Cobranças vindas de assinatura (subscription) ou
    // parcelamento (installment) representam mensalidade/plano e jamais
    // devem virar recarga de créditos.
    const subscriptionId = this.getString(asaasPayment.subscription);
    const installmentId = this.getString(asaasPayment.installment);
    if (subscriptionId || installmentId) {
      throw new BadRequestException(
        `Cobrança ${asaasChargeId} está vinculada a ${subscriptionId ? 'uma assinatura' : 'um parcelamento'} e não pode ser recuperada como recarga de créditos`,
      );
    }

    // Garante que a cobrança pertence à empresa informada antes de criar a
    // recarga, evitando aplicar créditos em conta errada quando o customerId
    // do Asaas não bate com o asaasCustomerId da empresa.
    const paymentCustomerId = this.getString(asaasPayment.customer);
    if (
      company.asaasCustomerId &&
      paymentCustomerId &&
      paymentCustomerId !== company.asaasCustomerId
    ) {
      throw new BadRequestException(
        `Cobrança ${asaasChargeId} pertence a outro cliente no Asaas (esperado ${company.asaasCustomerId}, recebido ${paymentCustomerId})`,
      );
    }

    const amountCents = Math.round(
      ((asaasPayment.value as number) ?? 0) * 100,
    );
    const paymentMethod = this.mapAsaasBillingTypeToPaymentMethod(
      asaasPayment.billingType as string,
    );

    const topup = await this.prisma.creditTopup.create({
      data: {
        companyId,
        paymentMethod,
        amountCents,
        status: CreditTopupStatus.PENDING,
        asaasChargeId,
        rawPaymentPayload: asaasPayment as Prisma.InputJsonValue,
      },
    });

    this.logger.log(
      `Recarga ${topup.id} recuperada manualmente para cobrança Asaas ${asaasChargeId}`,
    );

    if (isPaid) {
      return this.applyPaidTopupById(
        companyId,
        topup.id,
        asaasPayment as Record<string, unknown>,
      );
    }

    return topup;
  }

  private async applyPaidTopupByAsaasChargeId(
    asaasChargeId: string,
    rawPayload?: Record<string, unknown>,
  ) {
    const topup = await this.prisma.creditTopup.findUnique({
      where: { asaasChargeId },
    });
    if (!topup) {
      // Importante: NÃO criar CreditTopup automaticamente neste ponto. O mesmo
      // asaasCustomerId é usado para cobranças que não são recargas (ex.:
      // mensalidade do plano via subscription), e criar uma recarga aqui
      // resulta em créditos indevidos. Caso o pagamento seja de fato uma
      // recarga que falhou ao persistir localmente, a recuperação deve ser
      // feita manualmente via POST /credits/:companyId/topups/recover.
      const payment = rawPayload ? this.extractAsaasPayment(rawPayload) : null;
      const subscriptionId = payment
        ? this.getString(payment.subscription)
        : undefined;
      const installmentId = payment
        ? this.getString(payment.installment)
        : undefined;
      this.logger.warn(
        `Webhook Asaas ${asaasChargeId} sem CreditTopup correspondente   ignorando (subscription=${subscriptionId ?? 'none'}, installment=${installmentId ?? 'none'})`,
      );
      return null;
    }
    return this.applyPaidTopupById(topup.companyId, topup.id, rawPayload);
  }

  private async applyPaidTopupById(
    companyId: string,
    topupId: string,
    rawPayload?: Record<string, unknown>,
    paidAt?: Date,
    ledgerMetadata?: Record<string, unknown>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.creditTopup.updateMany({
        where: {
          id: topupId,
          companyId,
          status: { not: CreditTopupStatus.PAID },
        },
        data: {
          status: CreditTopupStatus.PAID,
          paidAt: paidAt ?? new Date(),
          ...(rawPayload
            ? { rawPaymentPayload: rawPayload as Prisma.InputJsonValue }
            : {}),
        },
      });

      const topup = await tx.creditTopup.findFirst({
        where: { id: topupId, companyId },
      });
      if (!topup) {
        throw new NotFoundException('Recarga não encontrada');
      }
      if (changed.count === 0) {
        return topup;
      }

      const wallet = await tx.companyCreditWallet.upsert({
        where: { companyId },
        create: {
          companyId,
          balanceCents: topup.amountCents,
        },
        update: {
          balanceCents: { increment: topup.amountCents },
        },
      });

      await tx.creditLedgerEntry.create({
        data: {
          companyId,
          topupId: topup.id,
          type: CreditLedgerEntryType.TOPUP,
          amountCents: topup.amountCents,
          balanceAfterCents: wallet.balanceCents,
          metadata: (ledgerMetadata ??
            rawPayload ?? {
              source: 'manual-status-update',
            }) as Prisma.InputJsonValue,
        },
      });

      return tx.creditTopup.findUniqueOrThrow({ where: { id: topupId } });
    });
  }

  private async updateTopupByAsaasChargeId(
    asaasChargeId: string,
    status: CreditTopupStatus,
    rawPayload: Record<string, unknown>,
  ) {
    const topup = await this.prisma.creditTopup.findUnique({
      where: { asaasChargeId },
    });
    if (!topup) {
      this.logger.warn(
        `Recarga não encontrada para cobrança Asaas ${asaasChargeId}`,
      );
      return null;
    }
    if (topup.status === CreditTopupStatus.PAID) {
      return topup;
    }
    return this.prisma.creditTopup.update({
      where: { id: topup.id },
      data: {
        status,
        rawPaymentPayload: rawPayload as Prisma.InputJsonValue,
      },
    });
  }

  private async ensureCompany(companyId: string): Promise<CompanyWithAddress> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { address: true },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }
    return company;
  }

  private async resolveAsaasCustomerId(
    company: CompanyWithAddress,
  ): Promise<string> {
    if (company.asaasCustomerId) {
      return company.asaasCustomerId;
    }

    const customer = await this.asaasService.createCustomer({
      name: company.name,
      cpfCnpj: company.cnpj,
      email: company.email,
      address: this.addressLine(company),
      province: company.address?.state ?? '',
      postalCode: company.address?.zipCode ?? '',
      mobilePhone: company.phone?.replace(/\D/g, '') ?? '',
      addressNumber: company.address?.number ?? '',
      complement: company.address?.complement ?? '',
      company: company.name,
    });

    await this.prisma.company.update({
      where: { id: company.id },
      data: { asaasCustomerId: customer.id },
    });

    return customer.id;
  }

  private addressLine(company: CompanyWithAddress) {
    const address = company.address;
    if (!address) return '';
    return [
      address.street,
      address.number,
      address.neighborhood,
      address.city,
      address.state,
    ]
      .filter(Boolean)
      .join(', ');
  }

  private normalizeProductCode(code: string) {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('Código do produto é obrigatório');
    }
    return normalized;
  }

  private toAsaasBillingType(paymentMethod: CreditPaymentMethod) {
    return paymentMethod;
  }

  private mapAsaasBillingTypeToPaymentMethod(
    billingType?: string,
  ): CreditPaymentMethod {
    const normalized = billingType?.toUpperCase();
    if (normalized === 'CREDIT_CARD') return CreditPaymentMethod.CREDIT_CARD;
    if (normalized === 'DEBIT_CARD') return CreditPaymentMethod.DEBIT_CARD;
    return CreditPaymentMethod.PIX;
  }

  private resolveOrderBy(pagination: PaginationDto, allowedFields: string[]) {
    const field =
      pagination.orderBy && allowedFields.includes(pagination.orderBy)
        ? pagination.orderBy
        : 'createdAt';
    const direction = pagination.orderDirection ?? 'desc';
    return { [field]: direction };
  }

  private createdAtFilter(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return {};
    return {
      createdAt: {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      },
    };
  }

  private paginated<T>(items: T[], total: number, page: number, limit: number) {
    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / (limit || 10)),
      },
    };
  }

  private extractAsaasPayment(
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    const payment = payload.payment;
    if (payment && typeof payment === 'object' && !Array.isArray(payment)) {
      return payment as Record<string, unknown>;
    }
    return payload;
  }

  private mapAsaasTopupStatus(
    event?: string,
    paymentStatus?: string,
  ): CreditTopupStatus | null {
    const normalizedEvent = event?.toUpperCase();
    const normalizedStatus = paymentStatus?.toUpperCase();

    if (
      ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_APPROVED'].includes(
        normalizedEvent ?? '',
      ) ||
      ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(
        normalizedStatus ?? '',
      )
    ) {
      return CreditTopupStatus.PAID;
    }

    if (
      ['PAYMENT_DELETED', 'PAYMENT_REFUNDED'].includes(normalizedEvent ?? '') ||
      normalizedStatus === 'REFUNDED'
    ) {
      return CreditTopupStatus.CANCELED;
    }

    if (normalizedStatus === 'OVERDUE') {
      return CreditTopupStatus.EXPIRED;
    }

    if (
      ['PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE'].includes(
        normalizedEvent ?? '',
      ) ||
      normalizedStatus?.includes('CHARGEBACK')
    ) {
      return CreditTopupStatus.FAILED;
    }

    if (
      normalizedStatus === 'PENDING' ||
      normalizedStatus === 'AWAITING_RISK_ANALYSIS'
    ) {
      return CreditTopupStatus.PENDING;
    }

    return null;
  }

  private getString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
  }
}
