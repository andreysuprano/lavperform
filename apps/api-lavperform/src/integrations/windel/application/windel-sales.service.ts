import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { WindelService } from '../api/windel.service';
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

      this.logger.log(`Integração encontrada. Buscando ordens na API Windel...`);

      const summaries = await this.windelService.listAttendedOrders(
        credentials,
        date,
      );

      this.logger.log(
        `Encontradas ${summaries.length} ordens Windel para processar`,
      );

      for (const summary of summaries) {
        if (summary.situacao !== 'Atendido') {
          this.logger.log(
            `Ordem Windel ${summary.id} com situação ${summary.situacao} ignorada`,
          );
          continue;
        }

        await this.enqueueAttendedOrder(companyId, credentials, summary);
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
    credentials: { email: string; password: string },
    summary: WindelServiceOrderSummary,
  ): Promise<void> {
    await sleep(DEFAULT_PARTNER_HTTP_DELAY_MS);
    const order = await this.windelService.getOrder(credentials, summary.id);

    let person: WindelPerson | null = null;
    if (order.pessoaId) {
      await sleep(DEFAULT_PARTNER_HTTP_DELAY_MS);
      person = await this.windelService.getPerson(credentials, order.pessoaId);
    }

    await this.windelSaleProcessQueue.add(
      QUEUE_NAMES.WINDEL_SALE_PROCESS,
      { companyId, order, person },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );
  }
}
