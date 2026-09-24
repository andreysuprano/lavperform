import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AgidezService } from '../api/agidez.service';
import {
  AgidezCredentials,
  AgidezProduto,
  AgidezServico,
  AgidezTicket,
} from '../api/agidez.types';
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
import { AgidezSaleMapping } from '../mappings/agidez-sale-mapping';
import { AgidezImportHistoricalSalesDto } from './dto/import-historical-sales.dto';

const PARTNER_SLUGS = ['HYBEX', 'AGIDEZ'] as const;

@Injectable()
export class AgidezSalesService {
  private readonly logger = new Logger(AgidezSalesService.name);

  constructor(
    private readonly agidezService: AgidezService,
    private readonly prisma: PrismaService,
    @Inject('IDigitalMenuIntegrationRepository')
    private readonly digitalMenuIntegrationRepository: IDigitalMenuIntegrationRepository,
    private readonly customerIdentityService: CustomerIdentityService,
    private readonly orderService: OrderService,
    @InjectQueue(QUEUE_NAMES.AGIDEZ_SALES_IMPORT)
    private readonly agidezSalesQueue: Queue,
    @InjectQueue(QUEUE_NAMES.AGIDEZ_SALE_PROCESS)
    private readonly agidezSaleProcessQueue: Queue,
  ) {}

  async processDailySales(companyId: string, date: string): Promise<void> {
    const integration = await this.resolveIntegration(companyId);
    if (!integration) return;

    const credentials = this.toCredentials(integration);
    const { tickets, services, products } = await this.agidezService.getDailySales(
      credentials,
      date,
    );
    const ticketIds = new Set(tickets.map((ticket) => ticket.CodigoTicket));

    this.logger.log(
      `${tickets.length} tickets Agidez para empresa ${companyId} - ${date}`,
    );

    for (const ticket of tickets) {
      await this.agidezSaleProcessQueue.add(
        QUEUE_NAMES.AGIDEZ_SALE_PROCESS,
        {
          companyId,
          ticket,
          services: services.filter(
            (service) => service.CodigoTicket === ticket.CodigoTicket,
          ),
          products: products.filter(
            (product) => product.CodigoTicket === ticket.CodigoTicket,
          ),
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          jobId: `agidez-sale:${companyId}:${ticket.CodigoLoja}:${ticket.CodigoTicket}`,
        },
      );
    }

    const ignored = services.filter(
      (service) => !ticketIds.has(service.CodigoTicket),
    ).length;
    if (ignored > 0) {
      this.logger.warn(
        `${ignored} serviços Agidez fora dos tickets do dia ${date} foram ignorados`,
      );
    }
  }

  async syncCustomers(companyId: string): Promise<void> {
    const integration = await this.resolveIntegration(companyId);
    if (!integration) return;

    const customers = await this.agidezService.getCustomers(
      this.toCredentials(integration),
    );

    this.logger.log(
      `${customers.length} clientes Agidez para empresa ${companyId}`,
    );

    for (const customer of customers) {
      const incoming = AgidezSaleMapping.toCustomerIncomingFromCatalog(customer);
      if (!incoming.phone) continue;
      await this.customerIdentityService.resolveForSale({
        companyId,
        incoming,
        salesChannel: 'AGIDEZ',
        partner: { partnerSlug: 'HYBEX', name: 'Hybex' },
      });
    }
  }

  async processSale(
    companyId: string,
    ticket: AgidezTicket,
    services: AgidezServico[],
    products: AgidezProduto[],
  ): Promise<void> {
    const incoming = AgidezSaleMapping.toCustomerIncoming(ticket);
    const customer = await this.customerIdentityService.resolveForSale({
      companyId,
      incoming,
      salesChannel: 'AGIDEZ',
      partner: { partnerSlug: 'HYBEX', name: 'Hybex' },
    });

    const integratorOrderId = AgidezSaleMapping.toOrder(
      ticket,
      services,
      products,
      customer?.id ?? null,
      companyId,
    ).integratorOrderId!;

    const existingOrder = await this.orderService.findByIntegratorOrderId(
      companyId,
      integratorOrderId,
    );

    if (existingOrder) {
      this.logger.log(
        `Ticket Agidez ${ticket.CodigoTicket} já existe, ignorando`,
      );
      return;
    }

    const orderData = AgidezSaleMapping.toOrder(
      ticket,
      services,
      products,
      customer?.id ?? null,
      companyId,
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
      `Pedido ${createdOrder.id} criado para ticket Agidez ${ticket.CodigoTicket}`,
    );
  }

  async importHistoricalSales(
    companyId: string,
    importDto: AgidezImportHistoricalSalesDto,
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

    await this.agidezSalesQueue.add(
      QUEUE_NAMES.AGIDEZ_SALES_IMPORT,
      { companyId, syncCustomers: true },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        jobId: `agidez-customers:${companyId}`,
      },
    );

    const { startDate, endDate } = resolveImportDateRange(importDto);
    const dates = buildUtcDateOnlyRange(startDate, endDate);

    let jobsCreated = 1;
    for (const date of dates) {
      await this.agidezSalesQueue.add(
        QUEUE_NAMES.AGIDEZ_SALES_IMPORT,
        { companyId, date },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          jobId: `agidez-import:${companyId}:${date}`,
        },
      );
      jobsCreated++;
    }

    return {
      message: 'Importação histórica Agidez iniciada com sucesso',
      totalDays: dates.length,
      startDate: toDateOnlyString(startDate),
      endDate: toDateOnlyString(endDate),
      jobsCreated,
    };
  }

  private async resolveIntegration(companyId: string) {
    const partner = await this.prisma.partner.findFirst({
      where: { partnerSlug: { in: [...PARTNER_SLUGS] } },
      orderBy: { partnerSlug: 'desc' },
    });
    if (!partner) {
      throw new Error('Partner HYBEX não encontrado no sistema');
    }

    const integration =
      await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(
        companyId,
        partner.id,
      );

    if (!integration?.apiKey || !integration.apiSecret || !integration.password || !integration.merchantId) {
      this.logger.warn(
        `Integração Agidez incompleta para empresa ${companyId}`,
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
      where: { partnerSlug: { in: [...PARTNER_SLUGS] } },
      orderBy: { partnerSlug: 'desc' },
    });
    if (!partner) {
      throw new NotFoundException('Partner HYBEX não encontrado no sistema');
    }

    const integration =
      await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(
        companyId,
        partner.id,
      );
    if (!integration) {
      throw new NotFoundException(
        `Integração Agidez não encontrada para empresa ${companyId}`,
      );
    }

    this.assertCredentials(integration, companyId);
    return integration;
  }

  private assertCredentials(
    integration: DigitalMenuIntegration,
    companyId: string,
  ) {
    if (
      !integration.apiKey ||
      !integration.apiSecret ||
      !integration.password ||
      !integration.merchantId
    ) {
      throw new NotFoundException(
        `Credenciais Agidez incompletas para empresa ${companyId}`,
      );
    }
  }

  private toCredentials(integration: DigitalMenuIntegration): AgidezCredentials {
    const accountCode = Number(integration.apiSecret);
    const storeCode = Number(integration.merchantId);
    if (!Number.isInteger(accountCode) || !Number.isInteger(storeCode)) {
      throw new NotFoundException(
        'Código da conta (apiSecret) e código da loja (merchantId) precisam ser numéricos',
      );
    }

    return {
      apiPassword: integration.password!,
      accountCode,
      storeCode,
      token: integration.apiKey!,
    };
  }
}
