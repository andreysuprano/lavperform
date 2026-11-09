import { Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { IDigitalMenuIntegrationRepository } from '../../../partners/domain/digital-menu-integration.repository.interface';
import { CustomerIdentityService } from '../../../customers/application/customer-identity.service';
import { OrderService } from '../../../orders/application/order.service';
import { toDateOnlyString } from '../../../common/utils/date.utils';
import {
  buildUtcDateOnlyRange,
  resolveImportDateRange,
} from '../../import-date-range.util';
import { salesDailyImportJobId } from '../../sales-import/sales-import-schedule';
import {
  buildSalesImportJobOptions,
  enqueueSalesImportJob,
} from '../../sales-import/sales-import-queue';
import { DigitalMenuIntegration } from '../../../partners/domain/digital-menu-integration.entity';
import { RedisService } from '../../../common/redis/redis.service';
import {
  WaymoneyApiSession,
  WaymoneyService,
} from '../api/waymoney.service';
import {
  WaymoneyBranch,
  WaymoneyClient,
  WaymoneyPackagePurchase,
  WaymoneyPayment,
  isImportableCycle,
  isImportablePackagePurchase,
} from '../api/waymoney.types';
import {
  waymoneyCycleToOrder,
  waymoneyIntegratorOrderId,
  waymoneyPackageToOrder,
} from '../mappings/waymoney-sale-mapping';
import { waymoneyDayRange } from '../waymoney-day';
import {
  WAYMONEY_AUTH_BLOCK_TTL_SECONDS,
  waymoneyAuthBlockKey,
} from '../waymoney-auth-block';
import { WaymoneyImportHistoricalSalesDto } from './dto/import-historical-sales.dto';

const SALE_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: true,
  removeOnFail: true,
};

function isIntegratorOrderIdUniqueConflict(error: unknown): boolean {
  const err = error as { code?: string; meta?: { target?: unknown } };
  if (err?.code !== 'P2002') {
    return false;
  }
  const target = err.meta?.target;
  if (typeof target === 'string') {
    return target.includes('integratorOrderId');
  }
  return Array.isArray(target) && target.includes('integratorOrderId');
}

@Injectable()
export class WaymoneySalesService {
  private readonly logger = new Logger(WaymoneySalesService.name);

  constructor(
    private readonly waymoneyService: WaymoneyService,
    private readonly prisma: PrismaService,
    @Inject('IDigitalMenuIntegrationRepository')
    private readonly digitalMenuIntegrationRepository: IDigitalMenuIntegrationRepository,
    private readonly customerIdentityService: CustomerIdentityService,
    private readonly orderService: OrderService,
    @InjectQueue(QUEUE_NAMES.WAYMONEY_SALES_IMPORT)
    private readonly importQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WAYMONEY_SALE_PROCESS)
    private readonly saleQueue: Queue,
    @Optional() private readonly redis?: RedisService,
  ) {}

  async processDailySales(companyId: string, date: string): Promise<void> {
    const integration = await this.loadIntegration(companyId);
    if (!integration) {
      return;
    }

    const session = await this.waymoneyService.openSession({
      email: integration.merchantId!,
      password: integration.apiKey!,
    });
    const branches = await session.listBranches();

    for (const branch of branches) {
      await this.enqueueBranch(companyId, session, branch, date);
    }
  }

  async processCycle(
    companyId: string,
    payment: WaymoneyPayment,
  ): Promise<void> {
    const integratorOrderId = waymoneyIntegratorOrderId('payment', payment.id);
    if (await this.alreadyImported(companyId, integratorOrderId)) {
      return;
    }

    const client = await this.clientFor(companyId, payment.clientId);
    const customer = await this.resolveCustomer(companyId, client);
    const order = waymoneyCycleToOrder(payment, customer?.id ?? null, companyId);
    await this.createOrder(order, payment.id);
  }

  async processPackagePurchase(
    companyId: string,
    purchase: WaymoneyPackagePurchase,
  ): Promise<void> {
    const integratorOrderId = waymoneyIntegratorOrderId('package', purchase.id);
    if (await this.alreadyImported(companyId, integratorOrderId)) {
      return;
    }

    const client = await this.clientFor(companyId, purchase.clientId);
    const customer = await this.resolveCustomer(companyId, client);
    const order = waymoneyPackageToOrder(
      purchase,
      customer?.id ?? null,
      companyId,
    );
    await this.createOrder(order, purchase.id);
  }

  async importHistoricalSales(
    companyId: string,
    importDto: WaymoneyImportHistoricalSalesDto = {},
    integration?: DigitalMenuIntegration,
  ) {
    const loaded =
      integration ?? (await this.loadIntegration(companyId, { required: true }));
    if (!loaded?.merchantId || !loaded.apiKey) {
      throw new NotFoundException(
        `E-mail ou senha não configurados para empresa ${companyId}`,
      );
    }

    const { startDate, endDate } = resolveImportDateRange(importDto);
    const dates = buildUtcDateOnlyRange(startDate, endDate);
    let jobsCreated = 0;

    for (const date of dates) {
      const result = await enqueueSalesImportJob(
        this.importQueue,
        QUEUE_NAMES.WAYMONEY_SALES_IMPORT,
        { companyId, date },
        buildSalesImportJobOptions(
          salesDailyImportJobId('waymoney', companyId, date),
        ),
      );
      if (result === 'queued') {
        jobsCreated += 1;
      }
    }

    return {
      message: 'Importação histórica WayMoney iniciada com sucesso',
      totalDays: dates.length,
      startDate: toDateOnlyString(startDate),
      endDate: toDateOnlyString(endDate),
      jobsCreated,
    };
  }

  async blockAuth(companyId: string, reason: string): Promise<void> {
    await this.redis?.setJson(
      waymoneyAuthBlockKey(companyId),
      { reason, at: new Date().toISOString() },
      WAYMONEY_AUTH_BLOCK_TTL_SECONDS,
    );
  }

  private async enqueueBranch(
    companyId: string,
    session: WaymoneyApiSession,
    branch: WaymoneyBranch,
    date: string,
  ): Promise<void> {
    const { startDate, endDate } = waymoneyDayRange(date, branch.timezone);
    const payments = await session.listPayments(branch.id, startDate, endDate);
    const purchases = await session.listPackagePurchases(
      branch.id,
      startDate,
      endDate,
    );
    const branchRef = { id: branch.id, name: branch.name ?? 'Filial' };

    for (const payment of payments) {
      if (!isImportableCycle(payment)) {
        continue;
      }
      await this.saleQueue.add(
        QUEUE_NAMES.WAYMONEY_SALE_PROCESS,
        {
          companyId,
          payment: {
            ...payment,
            branch: payment.branch?.name ? payment.branch : branchRef,
          },
        },
        SALE_JOB_OPTIONS,
      );
    }

    for (const purchase of purchases) {
      if (!isImportablePackagePurchase(purchase)) {
        continue;
      }
      await this.saleQueue.add(
        QUEUE_NAMES.WAYMONEY_SALE_PROCESS,
        {
          companyId,
          packagePurchase: {
            ...purchase,
            branch: purchase.branch?.name ? purchase.branch : branchRef,
          },
        },
        SALE_JOB_OPTIONS,
      );
    }
  }

  private async loadIntegration(
    companyId: string,
    options?: { required?: boolean },
  ): Promise<DigitalMenuIntegration | null> {
    const partner = await this.prisma.partner.findUnique({
      where: { partnerSlug: 'WAYMONEY' },
    });
    if (!partner) {
      throw new Error('Partner WAYMONEY não encontrado no sistema');
    }

    const integration =
      await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(
        companyId,
        partner.id,
      );
    if (!integration?.merchantId || !integration.apiKey) {
      if (options?.required) {
        throw new NotFoundException(
          `E-mail ou senha não configurados para empresa ${companyId}`,
        );
      }
      this.logger.warn(
        `Integração WayMoney incompleta para empresa ${companyId}`,
      );
      return null;
    }
    return integration;
  }

  private async clientFor(
    companyId: string,
    clientId?: string | null,
  ): Promise<WaymoneyClient | null> {
    if (!clientId) {
      return null;
    }
    const integration = await this.loadIntegration(companyId);
    if (!integration) {
      return null;
    }
    const session = await this.waymoneyService.openSession({
      email: integration.merchantId!,
      password: integration.apiKey!,
    });
    return session.getClient(clientId);
  }

  private async resolveCustomer(
    companyId: string,
    client: WaymoneyClient | null,
  ) {
    const phone = client?.phone?.trim();
    const cpf = (client?.cpf ?? client?.document)?.trim();
    if (!phone && !cpf) {
      return null;
    }
    return this.customerIdentityService.resolveForSale({
      companyId,
      salesChannel: 'WAYMONEY',
      incoming: {
        name: client?.name?.trim() || 'Cliente',
        phone: phone || undefined,
        cpf: cpf || undefined,
        email: client?.email?.trim() || undefined,
      },
    });
  }

  private async alreadyImported(
    companyId: string,
    integratorOrderId: number,
  ): Promise<boolean> {
    const existing = await this.prisma.order.findFirst({
      where: {
        companyId,
        salesChannel: 'WAYMONEY',
        integratorOrderId,
      },
    });
    return Boolean(existing);
  }

  private async createOrder(
    order: ReturnType<typeof waymoneyCycleToOrder>,
    sourceId: string,
  ): Promise<void> {
    try {
      await this.orderService.create(order);
    } catch (error) {
      if (isIntegratorOrderIdUniqueConflict(error)) {
        this.logger.log(
          `Pedido WayMoney ${sourceId} já foi gravado por outra execução, ignorando`,
        );
        return;
      }
      throw error;
    }
  }
}
