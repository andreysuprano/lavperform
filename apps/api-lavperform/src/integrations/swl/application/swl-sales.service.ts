import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { DateTime } from 'luxon';
import { PrismaService } from '../../../prisma/prisma.service';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { RedisService } from '../../../common/redis/redis.service';
import { IDigitalMenuIntegrationRepository } from '../../../partners/domain/digital-menu-integration.repository.interface';
import { DigitalMenuIntegration } from '../../../partners/domain/digital-menu-integration.entity';
import { CustomerIdentityService } from '../../../customers/application/customer-identity.service';
import { OrderService } from '../../../orders/application/order.service';
import { CreateOrderDto } from '../../../orders/application/dto/create-order.dto';
import { toDateOnlyString } from '../../../common/utils/date.utils';
import { resolveImportDateRange } from '../../import-date-range.util';
import { salesBackfill90JobId } from '../../sales-import/sales-import-schedule';
import {
  buildSalesImportJobOptions,
  enqueueSalesImportJob,
} from '../../sales-import/sales-import-queue';
import {
  DEFAULT_PARTNER_HTTP_DELAY_MS,
  sleep,
} from '../../sales-import/partner-http-pace';
import { SwlService } from '../api/swl.service';
import { SwlPermanentHttpError } from '../api/swl-http.error';
import { SwlAtendimento, SwlCliente } from '../api/swl.types';
import { swlAttendanceAction } from '../mappings/swl-sale-mapping';
import { swlCustomerIncoming } from '../mappings/swl-customer-mapping';
import { swlExternalOrderId, swlToOrder } from '../mappings/swl-sale-mapping';
import {
  SWL_AUTH_BLOCK_TTL_SECONDS,
  swlAuthBlockKey,
  swlTokenHash,
} from '../swl-auth-block';
import {
  emptyHistoricalWatermark,
  nextSwlWatermark,
  swlHistoricalWindows,
  swlWatermarkQuery,
} from '../swl-sync';
import { SwlImportHistoricalSalesDto } from './dto/import-historical-sales.dto';

export type SwlSyncMode = 'historical' | 'incremental';

export interface SwlSyncRange {
  startDate?: string;
  endDate?: string;
}

export interface SwlProcessAttendanceOptions {
  centroNome?: string;
  lastAttempt?: boolean;
}

export interface SwlProcessAttendanceResult {
  customerLinkMissing: true;
}

type WatermarkField =
  | 'customersWatermark'
  | 'deletionsWatermark'
  | 'attendancesWatermark';

interface SwlSyncStateRow {
  customersWatermark: Date | null;
  deletionsWatermark: Date | null;
  attendancesWatermark: Date | null;
}

const SWL_ZONE = 'America/Sao_Paulo';

const SALE_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: true,
  removeOnFail: true,
};

export class SwlCustomerLinkMissingError extends Error {
  constructor(swlCustomerId: number) {
    super(
      `Cliente SWL ${swlCustomerId} ainda sem vínculo com cliente da LavPerform`,
    );
    this.name = 'SwlCustomerLinkMissingError';
  }
}

function isOrderUniqueConflict(error: unknown): boolean {
  const err = error as { code?: string; meta?: { target?: unknown } };
  if (err?.code !== 'P2002') {
    return false;
  }
  const target = err.meta?.target;
  const names = ['externalOrderId', 'integratorOrderId'];
  if (typeof target === 'string') {
    return names.some((name) => target.includes(name));
  }
  return Array.isArray(target) && names.some((name) => target.includes(name));
}

function isForeignKeyRefusal(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return code === 'P2003' || code === 'P2014';
}

function civilDate(instant: Date): string {
  return DateTime.fromJSDate(instant, { zone: SWL_ZONE }).toISODate() as string;
}

function timestamps(values: Array<string | null | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value));
}

function listQuery(
  filters: Record<string, string | undefined>,
  cursor: string | undefined,
): Record<string, string | undefined> {
  const query: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) {
      query[key] = value;
    }
  }
  query.cursor = cursor;
  return query;
}

@Injectable()
export class SwlSalesService {
  private readonly logger = new Logger(SwlSalesService.name);

  constructor(
    private readonly swlService: SwlService,
    private readonly prisma: PrismaService,
    @Inject('IDigitalMenuIntegrationRepository')
    private readonly digitalMenuIntegrationRepository: IDigitalMenuIntegrationRepository,
    private readonly customerIdentityService: CustomerIdentityService,
    private readonly orderService: OrderService,
    @InjectQueue(QUEUE_NAMES.SWL_SALES_IMPORT)
    private readonly importQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SWL_SALE_PROCESS)
    private readonly saleQueue: Queue,
    @Optional() private readonly redis?: RedisService,
  ) {}

  // O cliente Prisma gerado pode ainda não conhecer os modelos da SWL.
  private get swlState() {
    return (this.prisma as any).swlSyncState;
  }

  private get swlLinks() {
    return (this.prisma as any).swlCustomerLink;
  }

  async importHistoricalSales(
    companyId: string,
    importDto: SwlImportHistoricalSalesDto = {},
  ) {
    await this.loadIntegration(companyId, { required: true });

    const { startDate, endDate } = this.resolveCivilRange(importDto);
    const windows = swlHistoricalWindows(startDate, endDate);
    const defaultRange = !importDto.startDate && !importDto.endDate;
    const jobId = defaultRange
      ? salesBackfill90JobId('swl', companyId)
      : `swl-historical:${companyId}:${startDate}:${endDate}`;

    const result = await enqueueSalesImportJob(
      this.importQueue,
      QUEUE_NAMES.SWL_SALES_IMPORT,
      { companyId, mode: 'historical', startDate, endDate },
      buildSalesImportJobOptions(jobId),
    );

    return {
      message: 'Importação histórica SWL iniciada com sucesso',
      startDate,
      endDate,
      windows: windows.length,
      jobsCreated: result === 'queued' ? 1 : 0,
    };
  }

  async syncCompany(
    companyId: string,
    mode: SwlSyncMode,
    range?: SwlSyncRange,
  ): Promise<void> {
    const integration = await this.loadIntegration(companyId);
    if (!integration) {
      return;
    }
    const token = integration.apiKey as string;

    try {
      await this.runSync(companyId, token, mode, range);
    } catch (error) {
      if (
        error instanceof SwlPermanentHttpError &&
        (error.status === 401 || error.status === 403)
      ) {
        await this.blockAuth(companyId, token);
      }
      throw error;
    }
  }

  async processAttendance(
    companyId: string,
    atendimento: SwlAtendimento,
    options: SwlProcessAttendanceOptions = {},
  ): Promise<SwlProcessAttendanceResult | void> {
    const existing = await this.orderService.findByExternalOrderId(
      companyId,
      swlExternalOrderId(atendimento.id),
    );
    const action = swlAttendanceAction(atendimento, Boolean(existing));
    if (action === 'skip') {
      return;
    }

    let customerId: string | null = null;
    let customerLinkMissing = false;
    if (action !== 'cancel') {
      const resolved = await this.resolveOrderCustomer(
        companyId,
        atendimento,
        existing?.customerId ?? null,
        options.lastAttempt === true,
      );
      customerId = resolved.customerId;
      customerLinkMissing = resolved.linkMissing;
    }

    const order = swlToOrder(
      atendimento,
      customerId,
      companyId,
      options.centroNome ?? '',
    );

    if (!existing) {
      await this.createOrder(order, atendimento.id);
    } else {
      await this.rewriteOrder(
        existing.id,
        existing.status,
        existing.customerId ?? null,
        order,
        atendimento,
        action === 'cancel',
      );
    }

    if (customerLinkMissing) {
      return { customerLinkMissing: true };
    }
  }

  async blockAuth(companyId: string, token: string): Promise<void> {
    await this.redis?.setJson(
      swlAuthBlockKey(companyId),
      swlTokenHash(token),
      SWL_AUTH_BLOCK_TTL_SECONDS,
    );
  }

  private async runSync(
    companyId: string,
    token: string,
    requestedMode: SwlSyncMode,
    range?: SwlSyncRange,
  ): Promise<void> {
    const state: SwlSyncStateRow | null = await this.swlState.findUnique({
      where: { companyId },
    });
    const mode: SwlSyncMode =
      requestedMode === 'incremental' && !state?.attendancesWatermark
        ? 'historical'
        : requestedMode;
    const fullLists = mode === 'historical';
    const attendancesWatermark = state?.attendancesWatermark ?? null;

    const lavanderia = await this.swlService.getLavanderia(token);
    const centers = new Map<number, string>();
    for (const center of lavanderia?.centrosDeCusto ?? []) {
      if (center.nome) {
        centers.set(center.id, center.nome);
      }
    }

    const sinceFor = (watermark: Date | null | undefined) =>
      !fullLists && watermark ? swlWatermarkQuery(watermark) : undefined;

    const customersSince = sinceFor(state?.customersWatermark);
    await sleep(DEFAULT_PARTNER_HTTP_DELAY_MS);
    const clientes = await this.swlService.listAll((cursor) =>
      this.swlService.listClientes(
        token,
        listQuery({ updatedSince: customersSince }, cursor),
      ),
    );
    for (const cliente of clientes) {
      await this.processCustomer(companyId, cliente);
    }
    await this.advanceWatermark(
      companyId,
      'customersWatermark',
      state?.customersWatermark ?? null,
      timestamps(clientes.map((cliente) => cliente.atualizadoEm)),
      attendancesWatermark,
    );

    const deletionsSince = sinceFor(state?.deletionsWatermark);
    await sleep(DEFAULT_PARTNER_HTTP_DELAY_MS);
    const excluidos = await this.swlService.listAll((cursor) =>
      this.swlService.listExcluidos(
        token,
        listQuery({ updatedSince: deletionsSince }, cursor),
      ),
    );
    for (const excluido of excluidos) {
      await this.processDeletedCustomer(companyId, excluido.id);
    }
    await this.advanceWatermark(
      companyId,
      'deletionsWatermark',
      state?.deletionsWatermark ?? null,
      timestamps(excluidos.map((excluido) => excluido.excluidoEm)),
      attendancesWatermark,
    );

    const seen: string[] = [];
    let emptyFallback: Date | null = null;
    if (fullLists) {
      const { startDate, endDate } = this.resolveCivilRange(range ?? {});
      const windows = swlHistoricalWindows(startDate, endDate);
      for (const window of windows) {
        await sleep(DEFAULT_PARTNER_HTTP_DELAY_MS);
        const atendimentos = await this.swlService.listAll((cursor) =>
          this.swlService.listAtendimentos(
            token,
            listQuery(
              { dataInicio: window.dataInicio, dataFim: window.dataFim },
              cursor,
            ),
          ),
        );
        await this.enqueueAttendances(companyId, atendimentos, centers);
        seen.push(...timestamps(atendimentos.map((a) => a.atualizadoEm)));
      }
      if (windows.length > 0) {
        emptyFallback = emptyHistoricalWatermark(
          windows[windows.length - 1].dataFim,
        );
      }
    } else {
      const since = swlWatermarkQuery(attendancesWatermark as Date);
      await sleep(DEFAULT_PARTNER_HTTP_DELAY_MS);
      const atendimentos = await this.swlService.listAll((cursor) =>
        this.swlService.listAtendimentos(
          token,
          listQuery({ updatedSince: since }, cursor),
        ),
      );
      await this.enqueueAttendances(companyId, atendimentos, centers);
      seen.push(...timestamps(atendimentos.map((a) => a.atualizadoEm)));
    }
    await this.advanceWatermark(
      companyId,
      'attendancesWatermark',
      attendancesWatermark,
      seen,
      emptyFallback,
    );
  }

  /**
   * Avança só depois da lista completa. Sem instante novo mantém o marco; sem
   * marco nenhum usa o `fallback` (se existir).
   */
  private async advanceWatermark(
    companyId: string,
    field: WatermarkField,
    previous: Date | null,
    seen: string[],
    fallback: Date | null,
  ): Promise<void> {
    let next = nextSwlWatermark(previous, seen);
    if (!next) {
      next = fallback;
    }
    if (!next || (previous && next.getTime() === previous.getTime())) {
      return;
    }
    await this.swlState.upsert({
      where: { companyId },
      create: { companyId, [field]: next },
      update: { [field]: next },
    });
  }

  private async enqueueAttendances(
    companyId: string,
    atendimentos: SwlAtendimento[],
    centers: Map<number, string>,
  ): Promise<void> {
    for (const atendimento of atendimentos) {
      const centroNome =
        atendimento.centroDeCustoId != null
          ? centers.get(atendimento.centroDeCustoId)
          : undefined;
      await this.saleQueue.add(
        QUEUE_NAMES.SWL_SALE_PROCESS,
        { companyId, atendimento, centroNome },
        SALE_JOB_OPTIONS,
      );
    }
  }

  private async processCustomer(
    companyId: string,
    cliente: SwlCliente,
  ): Promise<void> {
    const customer = await this.customerIdentityService.resolveForSale({
      companyId,
      salesChannel: 'SWL',
      incoming: swlCustomerIncoming(cliente),
    });
    if (!customer) {
      return;
    }
    await this.swlLinks.upsert({
      where: {
        companyId_swlCustomerId: { companyId, swlCustomerId: cliente.id },
      },
      create: { companyId, swlCustomerId: cliente.id, customerId: customer.id },
      update: { customerId: customer.id },
    });
  }

  private async processDeletedCustomer(
    companyId: string,
    swlCustomerId: number,
  ): Promise<void> {
    const link = await this.swlLinks.findUnique({
      where: { companyId_swlCustomerId: { companyId, swlCustomerId } },
    });
    if (!link) {
      return;
    }

    const otherLinks = await this.swlLinks.count({
      where: { customerId: link.customerId, NOT: { id: link.id } },
    });
    if (otherLinks > 0) {
      await this.swlLinks.delete({ where: { id: link.id } });
      return;
    }

    const [orders, messages, listMembers] = await Promise.all([
      this.prisma.order.count({ where: { customerId: link.customerId } }),
      this.prisma.message.count({ where: { customerId: link.customerId } }),
      this.prisma.customSendListMember.count({
        where: { customerId: link.customerId },
      }),
    ]);
    if (orders + messages + listMembers > 0) {
      return;
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: link.customerId },
      select: { addressId: true },
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        await (tx as any).swlCustomerLink.delete({ where: { id: link.id } });
        await tx.customer.delete({ where: { id: link.customerId } });
        if (customer?.addressId) {
          await tx.address.deleteMany({
            where: { id: customer.addressId, company: { is: null } },
          });
        }
      });
    } catch (error) {
      if (isForeignKeyRefusal(error)) {
        this.logger.warn(
          `Cliente ${link.customerId} excluído na SWL mantido: o banco recusou apagar`,
        );
        return;
      }
      throw error;
    }
  }

  private async resolveOrderCustomer(
    companyId: string,
    atendimento: SwlAtendimento,
    existingCustomerId: string | null,
    lastAttempt: boolean,
  ): Promise<{ customerId: string | null; linkMissing: boolean }> {
    const swlCustomerId = atendimento.clienteId;
    if (swlCustomerId === null || swlCustomerId === undefined) {
      return { customerId: null, linkMissing: false };
    }

    const link = await this.swlLinks.findUnique({
      where: { companyId_swlCustomerId: { companyId, swlCustomerId } },
    });
    if (link) {
      return { customerId: link.customerId, linkMissing: false };
    }
    if (existingCustomerId) {
      return { customerId: existingCustomerId, linkMissing: false };
    }
    if (!lastAttempt) {
      throw new SwlCustomerLinkMissingError(swlCustomerId);
    }
    this.logger.warn(
      `Atendimento SWL ${atendimento.id} gravado sem cliente: vínculo do cliente ${swlCustomerId} não existe`,
    );
    return { customerId: null, linkMissing: true };
  }

  private async createOrder(
    order: CreateOrderDto,
    swlId: number,
  ): Promise<void> {
    try {
      await this.orderService.create(order);
    } catch (error) {
      if (isOrderUniqueConflict(error)) {
        this.logger.log(
          `Pedido SWL ${swlId} já foi gravado por outra execução, ignorando`,
        );
        return;
      }
      throw error;
    }
  }

  private async rewriteOrder(
    orderId: string,
    existingStatus: string,
    existingCustomerId: string | null,
    order: CreateOrderDto,
    atendimento: SwlAtendimento,
    cancelling: boolean,
  ): Promise<void> {
    const paid =
      atendimento.situacao === 'ATIVO' &&
      atendimento.status?.pagamento === 'PAGO';

    const data: Record<string, unknown> = {
      status: cancelling || paid ? order.status : existingStatus,
      observation: order.observation,
      merchantId: order.merchantId,
      total: order.total,
      customerId: order.customerId ?? existingCustomerId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
    if (cancelling) {
      data.cancellationReason = order.cancellationReason;
    } else if (paid) {
      data.cancellationReason = null;
    }

    await this.prisma.$transaction(
      async (tx) => {
        await tx.order.update({ where: { id: orderId }, data });
        await tx.orderItem.deleteMany({ where: { orderId } });
        await tx.orderPayment.deleteMany({ where: { orderId } });
        await tx.orderDiscount.deleteMany({ where: { orderId } });

        const items = order.items ?? [];
        if (items.length > 0) {
          await tx.orderItem.createMany({
            data: items.map((item) => ({
              orderId,
              itemId: item.itemId,
              externalCode: item.externalCode,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              kind: item.kind,
              status: item.status,
              observation: item.observation,
            })),
          });
        }

        const payments = order.payments ?? [];
        if (payments.length > 0) {
          await tx.orderPayment.createMany({
            data: payments.map((payment) => ({
              orderId,
              total: payment.total,
              paymentType: payment.paymentType,
              paymentMethod: payment.paymentMethod,
              status: payment.status,
              paymentFee: payment.paymentFee ?? 0,
            })),
          });
        }

        const discounts = order.discounts ?? [];
        if (discounts.length > 0) {
          await tx.orderDiscount.createMany({
            data: discounts.map((discount) => ({
              orderId,
              type: discount.type,
              value: discount.value,
              description: discount.description,
            })),
          });
        }
      },
      { maxWait: 10_000, timeout: 60_000 },
    );
  }

  /**
   * Datas civis em São Paulo dos instantes de `resolveImportDateRange`. Datas
   * informadas já são civis e entram como vieram.
   */
  private resolveCivilRange(dto: SwlImportHistoricalSalesDto): {
    startDate: string;
    endDate: string;
  } {
    const { startDate, endDate } = resolveImportDateRange(dto);
    return {
      startDate: dto.startDate
        ? toDateOnlyString(startDate)
        : civilDate(startDate),
      endDate: dto.endDate ? toDateOnlyString(endDate) : civilDate(endDate),
    };
  }

  private async loadIntegration(
    companyId: string,
    options?: { required?: boolean },
  ): Promise<DigitalMenuIntegration | null> {
    const partner = await this.prisma.partner.findUnique({
      where: { partnerSlug: 'SWL' },
    });
    if (!partner) {
      throw new Error('Partner SWL não encontrado no sistema');
    }

    const integration =
      await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(
        companyId,
        partner.id,
      );
    if (!integration?.apiKey?.trim()) {
      if (options?.required) {
        throw new NotFoundException(
          `Token não configurado para empresa ${companyId}`,
        );
      }
      this.logger.warn(`Integração SWL sem token para empresa ${companyId}`);
      return null;
    }
    return integration;
  }
}
