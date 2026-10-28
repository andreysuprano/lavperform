import { BadRequestException, Injectable, Logger, Inject, NotFoundException, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { WindelApiSession, WindelService, WINDEL_ATTENDED } from '../api/windel.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  WindelPerson,
  WindelServiceOrderDetail,
  WindelServiceOrderSummary,
} from '../api/windel.types';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { IDigitalMenuIntegrationRepository } from '../../../partners/domain/digital-menu-integration.repository.interface';
import { CustomerIdentityService } from '../../../customers/application/customer-identity.service';
import { OrderService } from '../../../orders/application/order.service';
import { toDateOnlyString } from '../../../common/utils/date.utils';
import { safeFormatPhoneNumber } from '../../../common/utils/formatters';
import {
  buildUtcDateOnlyRange,
  resolveImportDateRange,
} from '../../import-date-range.util';
import { salesDailyImportJobId } from '../../sales-import/sales-import-schedule';
import {
  buildSalesImportJobOptions,
  enqueueSalesImportJob,
} from '../../sales-import/sales-import-queue';
import {
  DEFAULT_PARTNER_HTTP_DELAY_MS,
  sleep,
} from '../../sales-import/partner-http-pace';
import { DigitalMenuIntegration } from '../../../partners/domain/digital-menu-integration.entity';
import {
  windelIntegratorOrderId,
  windelSaleToOrder,
} from '../mappings/windel-sale-mapping';
import { WindelImportHistoricalSalesDto } from './dto/import-historical-sales.dto';
import { RedisService } from '../../../common/redis/redis.service';
import {
  WINDEL_AUTH_BLOCK_TTL_SECONDS,
  windelAuthBlockKey,
} from '../windel-auth-block';
import { windelCustomersJobId } from '../windel-lookback';

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

function filled(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function firstFilled(
  ...values: Array<string | null | undefined>
): string | undefined {
  for (const value of values) {
    const text = filled(value);
    if (text) {
      return text;
    }
  }
  return undefined;
}

function firstValidPhone(
  ...values: Array<string | null | undefined>
): string | undefined {
  for (const value of values) {
    const text = filled(value);
    if (text && safeFormatPhoneNumber(text)) {
      return text;
    }
  }
  return undefined;
}

function windelClientIncoming(person: WindelPerson): {
  name: string;
  phone?: string;
  cpf?: string;
  email?: string;
} | null {
  const phone = firstValidPhone(person.telefoneContato, person.telefone);
  const cpf = filled(person.cpfCnpj);
  if (!phone && !cpf) {
    return null;
  }
  const incoming: {
    name: string;
    phone?: string;
    cpf?: string;
    email?: string;
  } = {
    name: firstFilled(person.nome, person.fantasia) ?? 'Cliente',
  };
  if (phone) {
    incoming.phone = phone;
  }
  if (cpf) {
    incoming.cpf = cpf;
  }
  const email = filled(person.email);
  if (email) {
    incoming.email = email;
  }
  return incoming;
}

@Injectable()
export class WindelSalesService {
  private readonly logger = new Logger(WindelSalesService.name);

  constructor(
    private readonly windelService: WindelService,
    private readonly prisma: PrismaService,
    @Inject('IDigitalMenuIntegrationRepository')
    private readonly digitalMenuIntegrationRepository: IDigitalMenuIntegrationRepository,
    private readonly customerIdentityService: CustomerIdentityService,
    private readonly orderService: OrderService,
    @InjectQueue(QUEUE_NAMES.WINDEL_SALES_IMPORT)
    private readonly windelSalesQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WINDEL_SALE_PROCESS)
    private readonly windelSaleProcessQueue: Queue,
    @Optional() private readonly redis?: RedisService,
  ) {}

  /**
   * Processa as ordens atendidas do dia para uma empresa.
   * Busca os resumos na API Windel e enfileira cada ordem individualmente.
   */
  async processDailySales(companyId: string, date: string): Promise<void> {
    try {
      this.logger.log(
        `Iniciando processamento de vendas Windel para empresa ${companyId} - ${date}`,
      );

      const partner = await this.prisma.partner.findUnique({
        where: { partnerSlug: 'WINDEL' },
      });

      if (!partner) {
        throw new Error('Partner WINDEL não encontrado no sistema');
      }

      const integration =
        await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(
          companyId,
          partner.id,
        );

      if (!integration) {
        this.logger.warn(
          `Integração Windel não encontrada para empresa ${companyId}`,
        );
        return;
      }

      if (!integration.merchantId) {
        this.logger.warn(
          `E-mail (merchantId) não configurado para empresa ${companyId}`,
        );
        return;
      }

      if (!integration.apiKey) {
        this.logger.warn(
          `Senha (apiKey) não configurada para empresa ${companyId}`,
        );
        return;
      }

      const credentials = {
        email: integration.merchantId,
        password: integration.apiKey,
      };

      if (await this.authIsBlocked(companyId)) {
        this.logger.warn(`Login Windel bloqueado para empresa ${companyId}`);
        return;
      }

      this.logger.log(`Integração encontrada. Buscando ordens na API Windel...`);

      const session = await this.windelService.openSession(credentials);
      const summaries = await session.listAttendedOrders(date);

      this.logger.log(
        `Encontradas ${summaries.length} ordens Windel para processar`,
      );

      const attended = summaries.filter(
        (summary) => summary.situacao === WINDEL_ATTENDED,
      );
      const known = await this.findImportedOrderIds(
        companyId,
        attended.map((summary) => windelIntegratorOrderId(summary.id)),
      );

      for (const summary of summaries) {
        if (summary.situacao !== WINDEL_ATTENDED) {
          this.logger.log(
            `Ordem Windel ${summary.id} com situação ${summary.situacao} ignorada`,
          );
          continue;
        }

        const integratorOrderId = windelIntegratorOrderId(summary.id);
        if (known.has(integratorOrderId)) {
          this.logger.log(`Ordem Windel ${summary.id} já importada, ignorando`);
          continue;
        }

        await this.enqueueAttendedOrder(companyId, session, summary);
      }

      this.logger.log(
        `Ordens Windel atendidas adicionadas à fila de processamento para empresa ${companyId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar vendas Windel para empresa ${companyId}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Processa uma ordem individual. Se já existe pedido WINDEL da empresa com o
   * mesmo integratorOrderId, não cria cópia. Senão faz upsert do cliente e cria o pedido.
   */
  async processSale(
    companyId: string,
    order: WindelServiceOrderDetail,
    person: WindelPerson | null,
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando ordem Windel ${order.id} - Cliente: ${order.pessoaNome ?? person?.nome}`,
      );

      const integratorOrderId = windelIntegratorOrderId(order.id);
      const existingOrder = await this.prisma.order.findFirst({
        where: {
          companyId,
          salesChannel: 'WINDEL',
          integratorOrderId,
        },
      });

      if (existingOrder) {
        this.logger.log(`Pedido Windel ${order.id} já existe, ignorando`);
        return;
      }

      const name =
        firstFilled(order.pessoaNome, order.pessoa?.nome, person?.nome) ??
        'Cliente';
      const cpf = firstFilled(
        order.pessoaCpfCnpj,
        person?.cpfCnpj,
        order.pessoa?.cpfCnpj,
      );
      const email = filled(person?.email);
      const phone = order.pessoaId
        ? firstFilled(person?.telefone, person?.telefoneContato)
        : undefined;

      const incoming: {
        name: string;
        phone?: string;
        cpf?: string;
        email?: string;
      } = { name };
      if (phone) {
        incoming.phone = phone;
      }
      if (cpf) {
        incoming.cpf = cpf;
      }
      if (email) {
        incoming.email = email;
      }

      const customer = await this.customerIdentityService.resolveForSale({
        companyId,
        incoming,
      });

      this.logger.log(`Criando pedido para ordem Windel ${order.id}`);

      const orderData = windelSaleToOrder(
        order,
        person,
        customer?.id ?? null,
        companyId,
      );
      const createdAt = new Date(order.createdAt);

      try {
        const created = await this.orderService.create({
          ...orderData,
          createdAt,
          updatedAt: createdAt,
        });

        this.logger.log(
          `Pedido ${created.id} criado com sucesso para ordem Windel ${order.id}`,
        );
      } catch (error) {
        if (isIntegratorOrderIdUniqueConflict(error)) {
          this.logger.log(
            `Pedido Windel ${order.id} já foi gravado por outra execução, ignorando`,
          );
          return;
        }
        throw error;
      }
    } catch (error) {
      this.logger.error(
        `Erro ao processar ordem Windel ${order.id}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Grava o cadastro de clientes da Windel. A lista já traz telefone e CPF;
   * pessoa sem os dois não vira cliente.
   */
  async syncCustomers(companyId: string): Promise<void> {
    const partner = await this.prisma.partner.findUnique({
      where: { partnerSlug: 'WINDEL' },
    });
    if (!partner) {
      throw new Error('Partner WINDEL não encontrado no sistema');
    }

    const integration =
      await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(
        companyId,
        partner.id,
      );
    if (!integration?.merchantId || !integration.apiKey) {
      this.logger.warn(
        `Integração Windel incompleta para sincronizar clientes da empresa ${companyId}`,
      );
      return;
    }

    if (await this.authIsBlocked(companyId)) {
      this.logger.warn(`Login Windel bloqueado para empresa ${companyId}`);
      return;
    }

    const session = await this.windelService.openSession({
      email: integration.merchantId,
      password: integration.apiKey,
    });
    const people = await session.listClients();
    this.logger.log(
      `${people.length} clientes Windel listados para empresa ${companyId}`,
    );

    let saved = 0;
    for (const person of people) {
      const incoming = windelClientIncoming(person);
      if (!incoming) {
        continue;
      }
      await this.customerIdentityService.resolveForSale({
        companyId,
        incoming,
      });
      saved += 1;
    }

    this.logger.log(
      `${saved} clientes Windel gravados para empresa ${companyId}`,
    );
  }

  /**
   * Importa ordens históricas retroativas (padrão: 90 dias).
   */
  async importHistoricalSales(
    companyId: string,
    importDto: WindelImportHistoricalSalesDto,
    existingIntegration?: DigitalMenuIntegration,
  ): Promise<{
    message: string;
    totalDays: number;
    startDate: string;
    endDate: string;
    jobsCreated: number;
  }> {
    try {
      this.logger.log(
        `Iniciando importação histórica Windel para empresa ${companyId}`,
      );

      await this.assertAuthOpen(companyId);

      let integration = existingIntegration;

      if (!integration) {
        const company = await this.prisma.company.findUnique({
          where: { id: companyId },
        });

        if (!company) {
          throw new NotFoundException(`Empresa ${companyId} não encontrada`);
        }

        const partner = await this.prisma.partner.findUnique({
          where: { partnerSlug: 'WINDEL' },
        });

        if (!partner) {
          throw new NotFoundException('Partner WINDEL não encontrado no sistema');
        }

        integration =
          (await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(
            companyId,
            partner.id,
          )) ?? undefined;

        if (!integration) {
          throw new NotFoundException(
            `Integração Windel não encontrada para empresa ${companyId}`,
          );
        }
      }

      if (!integration.merchantId || !integration.apiKey) {
        throw new NotFoundException(
          `E-mail ou senha não configurados para empresa ${companyId}`,
        );
      }

      const { startDate, endDate } = resolveImportDateRange(importDto);

      this.logger.log(
        `Período: ${toDateOnlyString(startDate)} até ${toDateOnlyString(endDate)}`,
      );

      const dates = buildUtcDateOnlyRange(startDate, endDate);

      let jobsCreated = 0;
      const customersJob = await enqueueSalesImportJob(
        this.windelSalesQueue,
        QUEUE_NAMES.WINDEL_SALES_IMPORT,
        { companyId, syncCustomers: true },
        buildSalesImportJobOptions(windelCustomersJobId(companyId)),
      );
      if (customersJob === 'queued') {
        jobsCreated++;
      }
      for (const date of dates) {
        const result = await enqueueSalesImportJob(
          this.windelSalesQueue,
          QUEUE_NAMES.WINDEL_SALES_IMPORT,
          { companyId, date },
          buildSalesImportJobOptions(
            salesDailyImportJobId('windel', companyId, date),
          ),
        );

        if (result === 'queued') {
          jobsCreated++;
        } else {
          this.logger.debug(
            `Importação histórica ${date} já enfileirada para empresa ${companyId}`,
          );
        }
      }

      this.logger.log(
        `Importação histórica Windel iniciada: ${jobsCreated} jobs criados para empresa ${companyId}`,
      );

      return {
        message: 'Importação histórica Windel iniciada com sucesso',
        totalDays: dates.length,
        startDate: toDateOnlyString(startDate),
        endDate: toDateOnlyString(endDate),
        jobsCreated,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao iniciar importação histórica Windel para empresa ${companyId}:`,
        error.message,
      );
      throw error;
    }
  }

  private async enqueueAttendedOrder(
    companyId: string,
    session: WindelApiSession,
    summary: WindelServiceOrderSummary,
  ): Promise<void> {
    await sleep(DEFAULT_PARTNER_HTTP_DELAY_MS);
    const order = await session.getOrder(summary.id);

    let person: WindelPerson | null = null;
    if (order.pessoaId) {
      await sleep(DEFAULT_PARTNER_HTTP_DELAY_MS);
      person = await session.getPerson(order.pessoaId);
    }

    await enqueueSalesImportJob(
      this.windelSaleProcessQueue,
      QUEUE_NAMES.WINDEL_SALE_PROCESS,
      { companyId, order, person },
      {
        jobId: `windel-sale:${companyId}:${windelIntegratorOrderId(order.id)}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  private async findImportedOrderIds(
    companyId: string,
    integratorOrderIds: number[],
  ): Promise<Set<number>> {
    if (integratorOrderIds.length === 0) {
      return new Set();
    }
    const existing = await this.prisma.order.findMany({
      where: {
        companyId,
        salesChannel: 'WINDEL',
        integratorOrderId: { in: integratorOrderIds },
      },
      select: { integratorOrderId: true },
    });
    return new Set(
      existing
        .map((order) => order.integratorOrderId)
        .filter((id): id is number => id != null),
    );
  }

  private async authIsBlocked(companyId: string): Promise<boolean> {
    const blocked = await this.redis?.getJson(windelAuthBlockKey(companyId));
    return Boolean(blocked);
  }

  private async assertAuthOpen(companyId: string): Promise<void> {
    if (!(await this.authIsBlocked(companyId))) {
      return;
    }
    throw new BadRequestException(
      'Login Windel bloqueado após falha de autenticação. Atualize a senha ou aguarde 12 horas.',
    );
  }

  async blockAuth(companyId: string, reason: string): Promise<void> {
    await this.redis?.setJson(
      windelAuthBlockKey(companyId),
      { reason, at: new Date().toISOString() },
      WINDEL_AUTH_BLOCK_TTL_SECONDS,
    );
  }
}
