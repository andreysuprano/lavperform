import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EssenceService } from '../api/essence.service';
import { filterEssenceTicketsByDateRange } from '../api/essence-ticket-filter';
import { EssenceCredentials, EssenceTicket } from '../api/essence.types';
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
import { DigitalMenuIntegration } from '../../../partners/domain/digital-menu-integration.entity';
import {
  EssenceSaleMapping,
  essenceCustomerPhone,
  essenceExternalOrderId,
  essenceStoreMerchantId,
  essenceTicketIsCancelled,
} from '../mappings/essence-sale-mapping';
import { HybexEssenceImportHistoricalSalesDto } from './dto/import-historical-sales.dto';
import { resolveStoreDdd } from '../../agidez/mappings/store-ddd';

const PARTNER_SLUG = 'HYBEX_ESSENCE';

@Injectable()
export class HybexEssenceSalesService {
  private readonly logger = new Logger(HybexEssenceSalesService.name);

  constructor(
    private readonly essenceService: EssenceService,
    private readonly prisma: PrismaService,
    @Inject('IDigitalMenuIntegrationRepository')
    private readonly digitalMenuIntegrationRepository: IDigitalMenuIntegrationRepository,
    private readonly customerIdentityService: CustomerIdentityService,
    private readonly orderService: OrderService,
    @InjectQueue(QUEUE_NAMES.HYBEX_ESSENCE_SALES_IMPORT)
    private readonly salesImportQueue: Queue,
    @InjectQueue(QUEUE_NAMES.HYBEX_ESSENCE_SALE_PROCESS)
    private readonly saleProcessQueue: Queue,
  ) {}

  async processDailySales(companyId: string, date: string): Promise<void> {
    const integration = await this.resolveIntegration(companyId);
    if (!integration) {
      this.logger.error(
        `Integração Hybex Essence ausente ou incompleta para empresa ${companyId}; importação de vendas ignorada`,
      );
      return;
    }

    const credentials = this.toCredentials(integration);
    const catalogPhones = await this.loadCustomerPhonesByCode(
      companyId,
      credentials,
    );
    const tickets = (
      await this.essenceService.listTicketsForDay(credentials, date)
    )
      .filter((ticket) => ticket.Habilitado !== 0)
      .filter((ticket) => !essenceTicketIsCancelled(ticket));

    this.logger.log(
      `${tickets.length} tickets Essence para empresa ${companyId} - ${date}`,
    );

    await this.enqueueTicketsForSale(
      companyId,
      credentials.storeGuid,
      tickets,
      catalogPhones,
    );
  }

  async processSalesBackfill(
    companyId: string,
    startDate: string,
    endDate: string,
  ): Promise<{
    ticketsEnqueued: number;
    apiTicketCount: number;
    inRangeCount: number;
  }> {
    const integration = await this.resolveIntegration(companyId);
    if (!integration) {
      const message = `Integração Hybex Essence ausente ou incompleta para empresa ${companyId}; backfill abortado`;
      this.logger.error(message);
      throw new Error(message);
    }

    const credentials = this.toCredentials(integration);
    const catalogPhones = await this.loadCustomerPhonesByCode(
      companyId,
      credentials,
    );
    const allTickets = await this.essenceService.listAllTickets(credentials);
    const inRange = filterEssenceTicketsByDateRange(
      allTickets,
      startDate,
      endDate,
    );
    const tickets = inRange
      .filter((ticket) => ticket.Habilitado !== 0)
      .filter((ticket) => !essenceTicketIsCancelled(ticket));

    this.logger.log(
      `${tickets.length} tickets Essence (${startDate} → ${endDate}) para empresa ${companyId} — catálogo API ${allTickets.length} tickets`,
    );

    await this.enqueueTicketsForSale(
      companyId,
      credentials.storeGuid,
      tickets,
      catalogPhones,
    );

    if (allTickets.length === 0) {
      this.logger.warn(
        `Backfill Essence ${startDate}→${endDate}: API retornou 0 tickets para empresa ${companyId}`,
      );
    } else if (tickets.length === 0) {
      this.logger.warn(
        `Backfill Essence ${startDate}→${endDate}: ${allTickets.length} tickets na API, ${inRange.length} no intervalo, 0 elegíveis após filtros (empresa ${companyId})`,
      );
    }

    return {
      ticketsEnqueued: tickets.length,
      apiTicketCount: allTickets.length,
      inRangeCount: inRange.length,
    };
  }

  private async enqueueTicketsForSale(
    companyId: string,
    storeGuid: string,
    tickets: EssenceTicket[],
    catalogPhones: Map<string, string>,
  ) {
    for (const ticket of tickets) {
      await this.enqueueReplacing(this.saleProcessQueue, {
        name: QUEUE_NAMES.HYBEX_ESSENCE_SALE_PROCESS,
        data: {
          companyId,
          ticket,
          storeGuid,
          clientePhone: ticket.Cliente?.Codigo
            ? catalogPhones.get(ticket.Cliente.Codigo)
            : undefined,
        },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          jobId: `essence-sale:${companyId}:${storeGuid}:${ticket.Sequencia}`,
        },
      });
    }
  }

  private async loadCustomerPhonesByCode(
    companyId: string,
    credentials: EssenceCredentials,
  ): Promise<Map<string, string>> {
    const storeDdd = await this.storeDddFor(companyId);
    const customers = await this.essenceService.listAllCustomers(credentials);
    const map = new Map<string, string>();
    for (const customer of customers) {
      const code = customer.Codigo?.trim();
      if (!code) continue;
      const phone = essenceCustomerPhone(customer.Telefones, storeDdd);
      if (phone) map.set(code, phone);
    }
    return map;
  }

  async syncCustomers(companyId: string): Promise<void> {
    const integration = await this.resolveIntegration(companyId);
    if (!integration) {
      const message = `Integração Hybex Essence ausente ou incompleta para empresa ${companyId}; sync de clientes abortado`;
      this.logger.error(message);
      throw new Error(message);
    }

    const credentials = this.toCredentials(integration);
    const customers = await this.essenceService.listAllCustomers(credentials);
    const storeDdd = await this.storeDddFor(companyId);

    this.logger.log(
      `${customers.length} clientes Essence para empresa ${companyId}`,
    );

    for (const customer of customers) {
      if (customer.Habilitado === 0) continue;
      const incoming = EssenceSaleMapping.toCustomerFromCatalog(
        customer,
        storeDdd,
      );
      if (!incoming.phone) continue;
      await this.customerIdentityService.resolveForSale({
        companyId,
        incoming,
        salesChannel: 'HYBEX_ESSENCE',
        partner: { partnerSlug: PARTNER_SLUG, name: 'Hybex Essence' },
      });
    }
  }

  async processSale(
    companyId: string,
    ticket: EssenceTicket,
    storeGuid: string,
    clientePhone?: string,
  ): Promise<void> {
    if (ticket.Habilitado === 0 || essenceTicketIsCancelled(ticket)) {
      return;
    }

    const merchantId = essenceStoreMerchantId(storeGuid);
    const existingOrder = await this.prisma.order.findFirst({
      where: {
        companyId,
        salesChannel: 'HYBEX_ESSENCE',
        OR: [
          {
            externalOrderId: essenceExternalOrderId(storeGuid, ticket.Sequencia),
          },
          {
            displayId: ticket.Sequencia,
            merchantId,
          },
        ],
      },
      select: { id: true },
    });

    if (existingOrder) {
      this.logger.debug(
        `Ticket Essence ${ticket.Sequencia} já importado (${existingOrder.id})`,
      );
      return;
    }

    const incoming = {
      ...EssenceSaleMapping.toCustomerFromTicket(ticket),
      ...(clientePhone ? { phone: clientePhone } : {}),
    };
    let customer = await this.customerIdentityService.resolveForSale({
      companyId,
      incoming,
      salesChannel: 'HYBEX_ESSENCE',
      partner: { partnerSlug: PARTNER_SLUG, name: 'Hybex Essence' },
    });
    if (!customer && incoming.name) {
      customer = await this.prisma.customer.findFirst({
        where: {
          companyId,
          name: { equals: incoming.name, mode: 'insensitive' },
        },
      });
    }

    const orderData = EssenceSaleMapping.toOrder(
      ticket,
      customer?.id ?? null,
      companyId,
      storeGuid,
    );
    const {
      integratorOrderId: _integratorOrderId,
      items,
      discounts,
      payments,
      deliveryAddress,
      schedule,
      ...orderCreateData
    } = orderData;

    const createdOrder = await this.orderService.create({
      ...orderCreateData,
      items,
      discounts,
      payments,
      deliveryAddress,
      schedule,
    });

    this.logger.log(
      `Pedido ${createdOrder.id} criado para ticket Essence ${ticket.Sequencia}`,
    );
  }

  async importHistoricalSales(
    companyId: string,
    importDto: HybexEssenceImportHistoricalSalesDto,
    existingIntegration?: DigitalMenuIntegration,
  ): Promise<{
    message: string;
    totalDays: number;
    startDate: string;
    endDate: string;
    jobsCreated: number;
  }> {
    const integration = await this.requireIntegration(
      companyId,
      existingIntegration,
    );
    this.toCredentials(integration);

    await this.enqueueReplacing(this.salesImportQueue, {
      name: QUEUE_NAMES.HYBEX_ESSENCE_SALES_IMPORT,
      data: { companyId, syncCustomers: true },
      opts: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        jobId: `essence-customers:${companyId}`,
      },
    });

    const { startDate, endDate } = resolveImportDateRange(importDto);
    const start = toDateOnlyString(startDate);
    const end = toDateOnlyString(endDate);
    const dates = buildUtcDateOnlyRange(startDate, endDate);

    await this.enqueueReplacing(this.salesImportQueue, {
      name: QUEUE_NAMES.HYBEX_ESSENCE_SALES_IMPORT,
      data: {
        companyId,
        backfillRange: { startDate: start, endDate: end },
      },
      opts: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        jobId: `essence-backfill:${companyId}:${start}:${end}`,
      },
    });

    return {
      message: 'Importação histórica Hybex Essence iniciada com sucesso',
      totalDays: dates.length,
      startDate: start,
      endDate: end,
      jobsCreated: 2,
    };
  }

  private async storeDddFor(companyId: string): Promise<string | undefined> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { address: { select: { city: true, state: true } } },
    });
    return resolveStoreDdd(company?.address?.city, company?.address?.state);
  }

  private async enqueueReplacing(
    queue: Queue,
    job: {
      name: string;
      data: unknown;
      opts: {
        jobId: string;
        attempts: number;
        backoff: { type: 'exponential'; delay: number };
      };
    },
  ) {
    const existing = await queue.getJob(job.opts.jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'active') {
        this.logger.warn(`Job ${job.opts.jobId} ainda está em execução`);
        return;
      }
      await existing.remove();
    }
    await queue.add(job.name, job.data, job.opts);
  }

  private async resolveIntegration(companyId: string) {
    const partner = await this.prisma.partner.findFirst({
      where: { partnerSlug: PARTNER_SLUG },
    });
    if (!partner) {
      throw new Error('Partner HYBEX_ESSENCE não encontrado no sistema');
    }

    const integration =
      await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(
        companyId,
        partner.id,
      );

    if (
      !integration?.apiKey ||
      !integration.password ||
      !integration.merchantId
    ) {
      this.logger.warn(
        `Integração Hybex Essence incompleta para empresa ${companyId}`,
      );
      return null;
    }

    return integration;
  }

  private async requireIntegration(
    companyId: string,
    existingIntegration?: DigitalMenuIntegration,
  ) {
    if (existingIntegration) {
      this.assertCredentials(existingIntegration, companyId);
      return existingIntegration;
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Empresa ${companyId} não encontrada`);
    }

    const partner = await this.prisma.partner.findFirst({
      where: { partnerSlug: PARTNER_SLUG },
    });
    if (!partner) {
      throw new NotFoundException(
        'Partner HYBEX_ESSENCE não encontrado no sistema',
      );
    }

    const integration =
      await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(
        companyId,
        partner.id,
      );
    if (!integration) {
      throw new NotFoundException(
        `Integração Hybex Essence não encontrada para empresa ${companyId}`,
      );
    }

    this.assertCredentials(integration, companyId);
    return integration;
  }

  private assertCredentials(
    integration: DigitalMenuIntegration,
    companyId: string,
  ) {
    if (!integration.apiKey || !integration.password || !integration.merchantId) {
      throw new NotFoundException(
        `Credenciais Hybex Essence incompletas para empresa ${companyId}`,
      );
    }
  }

  private toCredentials(integration: DigitalMenuIntegration): EssenceCredentials {
    const storeGuid = integration.merchantId!.trim();
    const integrationKey = integration.apiKey!.trim();
    if (!storeGuid || !integrationKey) {
      throw new NotFoundException(
        'Código da loja (GUID) e chave de integração são obrigatórios',
      );
    }

    return {
      apiPassword: integration.password!,
      storeGuid,
      integrationKey,
    };
  }
}