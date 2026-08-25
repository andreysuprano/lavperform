import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { L2AutomateService } from '../api/l2automate.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { L2AutomateSale } from '../api/l2automate.types';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { IDigitalMenuIntegrationRepository } from '../../../partners/domain/digital-menu-integration.repository.interface';
import { CustomerIdentityService } from '../../../customers/application/customer-identity.service';
import { OrderService } from '../../../orders/application/order.service';
import { parseUTCDate, toDateOnlyString } from '../../../common/utils/date.utils';
import {
  buildUtcDateOnlyRange,
  resolveImportDateRange,
} from '../../import-date-range.util';
import { DigitalMenuIntegration } from '../../../partners/domain/digital-menu-integration.entity';
import { L2AutomateSaleMapping } from '../mappings/l2automate-sale-mapping';
import { L2AutomateImportHistoricalSalesDto } from './dto/import-historical-sales.dto';

@Injectable()
export class L2AutomateSalesService {
  private readonly logger = new Logger(L2AutomateSalesService.name);

  constructor(
    private readonly l2AutomateService: L2AutomateService,
    private readonly prisma: PrismaService,
    @Inject('IDigitalMenuIntegrationRepository')
    private readonly digitalMenuIntegrationRepository: IDigitalMenuIntegrationRepository,
    private readonly customerIdentityService: CustomerIdentityService,
    private readonly orderService: OrderService,
    @InjectQueue(QUEUE_NAMES.L2AUTOMATE_SALES_IMPORT)
    private readonly l2AutomateSalesQueue: Queue,
    @InjectQueue(QUEUE_NAMES.L2AUTOMATE_SALE_PROCESS)
    private readonly l2AutomateSaleProcessQueue: Queue,
  ) {}

  /**
   * Processa as vendas do dia para uma empresa específica.
   * Busca as vendas na API L2 Automate e enfileira cada uma individualmente.
   */
  async processDailySales(companyId: string, date: string): Promise<void> {
    try {
      this.logger.log(
        `Iniciando processamento de vendas L2 Automate para empresa ${companyId} - ${date}`,
      );

      const partner = await this.prisma.partner.findUnique({
        where: { partnerSlug: 'L2AUTOMATE' },
      });

      if (!partner) {
        throw new Error('Partner L2AUTOMATE não encontrado no sistema');
      }

      const integration =
        await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(
          companyId,
          partner.id,
        );

      if (!integration) {
        this.logger.warn(
          `Integração L2 Automate não encontrada para empresa ${companyId}`,
        );
        return;
      }

      if (!integration.apiKey) {
        this.logger.warn(
          `Token de API (apiKey) não configurado para empresa ${companyId}`,
        );
        return;
      }

      this.logger.log(
        `Integração encontrada. Buscando vendas na API L2 Automate...`,
      );

      const sales = await this.l2AutomateService.getDailySales(
        integration.apiKey,
        date,
      );

      this.logger.log(
        `Encontradas ${sales.length} vendas L2 Automate para processar`,
      );

      for (const sale of sales) {
        await this.l2AutomateSaleProcessQueue.add(
          QUEUE_NAMES.L2AUTOMATE_SALE_PROCESS,
          { companyId, sale },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
          },
        );
      }

      this.logger.log(
        `${sales.length} vendas L2 Automate adicionadas à fila de processamento para empresa ${companyId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar vendas L2 Automate para empresa ${companyId}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Processa uma venda individual: upsert do cliente e criação do pedido
   */
  async processSale(companyId: string, sale: L2AutomateSale): Promise<void> {
    try {
      this.logger.log(
        `Processando venda L2 Automate ${sale.id} - Cliente: ${sale.customer?.name}`,
      );

      const l2Customer = sale.customer;

      const customer = await this.customerIdentityService.resolveForSale({
        companyId,
        incoming: {
          name: l2Customer?.name?.trim() || 'Cliente',
          phone: l2Customer?.mobile,
          cpf: l2Customer?.document,
          birthDate: l2Customer?.birthDate
            ? toDateOnlyString(parseUTCDate(l2Customer.birthDate)!)
            : undefined,
        },
      });

      const integratorOrderId = L2AutomateSaleMapping.getIntegratorOrderId(sale.id);

      const existingOrder = await this.orderService.findByIntegratorOrderId(
        companyId,
        integratorOrderId,
      );

      if (existingOrder) {
        this.logger.log(`Pedido L2 Automate ${sale.id} já existe, ignorando`);
        return;
      }

      this.logger.log(`Criando pedido para venda L2 Automate ${sale.id}`);

      const orderData = L2AutomateSaleMapping.toOrder(sale, customer.id, companyId);
      const {
        integratorOrderId: _integratorOrderId,
        items,
        discounts,
        payments,
        deliveryAddress,
        schedule,
        ...orderCreateData
      } = orderData;

      const saleDate = parseUTCDate(sale.createdAt);

      const order = await this.orderService.create({
        ...orderCreateData,
        createdAt: saleDate!,
        updatedAt: saleDate!,
        items,
        discounts,
        payments,
        deliveryAddress,
        schedule,
      });

      this.logger.log(
        `Pedido ${order.id} criado com sucesso para venda L2 Automate ${sale.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar venda L2 Automate ${sale.id}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Importa vendas históricas retroativas (padrão: 90 dias)
   */
  async importHistoricalSales(
    companyId: string,
    importDto: L2AutomateImportHistoricalSalesDto,
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
        `Iniciando importação histórica L2 Automate para empresa ${companyId}`,
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
          where: { partnerSlug: 'L2AUTOMATE' },
        });

        if (!partner) {
          throw new NotFoundException(
            'Partner L2AUTOMATE não encontrado no sistema',
          );
        }

        integration =
          (await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(
            companyId,
            partner.id,
          )) ?? undefined;

        if (!integration) {
          throw new NotFoundException(
            `Integração L2 Automate não encontrada para empresa ${companyId}`,
          );
        }
      }

      if (!integration.apiKey) {
        throw new NotFoundException(
          `Token de API não configurado para empresa ${companyId}`,
        );
      }

      const { startDate, endDate } = resolveImportDateRange(importDto);

      this.logger.log(
        `Período: ${toDateOnlyString(startDate)} até ${toDateOnlyString(endDate)}`,
      );

      const dates = buildUtcDateOnlyRange(startDate, endDate);

      let jobsCreated = 0;
      for (const date of dates) {
        await this.l2AutomateSalesQueue.add(
          QUEUE_NAMES.L2AUTOMATE_SALES_IMPORT,
          { companyId, date },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          },
        );
        jobsCreated++;
      }

      this.logger.log(
        `Importação histórica L2 Automate iniciada: ${jobsCreated} jobs criados para empresa ${companyId}`,
      );

      return {
        message: 'Importação histórica L2 Automate iniciada com sucesso',
        totalDays: dates.length,
        startDate: toDateOnlyString(startDate),
        endDate: toDateOnlyString(endDate),
        jobsCreated,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao iniciar importação histórica L2 Automate para empresa ${companyId}:`,
        error.message,
      );
      throw error;
    }
  }
}
