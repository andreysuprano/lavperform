import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CiccloService } from '../api/cicclo.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CiccloSale } from '../api/cicclo.types';
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
import { CiccloSaleMapping } from '../mappings/cicclo-sale-mapping';
import { CiccloImportHistoricalSalesDto } from './dto/import-historical-sales.dto';

@Injectable()
export class CiccloSalesService {
  private readonly logger = new Logger(CiccloSalesService.name);

  constructor(
    private readonly ciccloService: CiccloService,
    private readonly prisma: PrismaService,
    @Inject('IDigitalMenuIntegrationRepository')
    private readonly digitalMenuIntegrationRepository: IDigitalMenuIntegrationRepository,
    private readonly customerIdentityService: CustomerIdentityService,
    private readonly orderService: OrderService,
    @InjectQueue(QUEUE_NAMES.CICCLO_SALES_IMPORT)
    private readonly ciccloSalesQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CICCLO_SALE_PROCESS)
    private readonly ciccloSaleProcessQueue: Queue,
  ) {}

  /**
   * Processa as vendas do dia para uma empresa específica
   * Busca as vendas na API Cicclo e enfileira cada uma individualmente
   */
  async processDailySales(companyId: string, date: string): Promise<void> {
    try {
      this.logger.log(
        `Iniciando processamento de vendas Cicclo para empresa ${companyId} - ${date}`,
      );

      const partner = await this.prisma.partner.findUnique({
        where: { partnerSlug: 'CICCLO' },
      });

      if (!partner) {
        throw new Error('Partner CICCLO não encontrado no sistema');
      }

      const integration =
        await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(
          companyId,
          partner.id,
        );

      if (!integration) {
        this.logger.warn(
          `Integração Cicclo não encontrada para empresa ${companyId}`,
        );
        return;
      }

      if (!integration.merchantId) {
        this.logger.warn(
          `Código da loja (merchantId) não configurado para empresa ${companyId}`,
        );
        return;
      }

      if (!integration.apiKey) {
        this.logger.warn(
          `Senha da API (apiKey) não configurada para empresa ${companyId}`,
        );
        return;
      }

      this.logger.log(`Integração encontrada. Buscando vendas na API Cicclo...`);

      const sales = await this.ciccloService.getDailySales(
        integration.merchantId,
        integration.apiKey,
        date,
      );

      this.logger.log(`Encontradas ${sales.length} vendas Cicclo para processar`);

      for (const sale of sales) {
        await this.ciccloSaleProcessQueue.add(
          QUEUE_NAMES.CICCLO_SALE_PROCESS,
          {
            companyId,
            sale,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
          },
        );
      }

      this.logger.log(
        `${sales.length} vendas Cicclo adicionadas à fila de processamento para empresa ${companyId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar vendas Cicclo para empresa ${companyId}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Processa uma venda individual: upsert do cliente e criação do pedido
   */
  async processSale(companyId: string, sale: CiccloSale): Promise<void> {
    try {
      this.logger.log(
        `Processando venda Cicclo ${sale.id} - Cliente: ${sale.customer?.name}`,
      );

      const ciccloCustomer = sale.customer;

      const customer = await this.customerIdentityService.resolveForSale({
        companyId,
        incoming: {
          name: ciccloCustomer?.name?.trim() || 'Cliente',
          phone: ciccloCustomer?.mobile,
          cpf: ciccloCustomer?.document,
          email: ciccloCustomer?.email,
          birthDate: ciccloCustomer?.birthDate
            ? toDateOnlyString(parseUTCDate(ciccloCustomer.birthDate)!)
            : undefined,
        },
      });

      const existingOrder = await this.orderService.findByIntegratorOrderId(
        companyId,
        sale.id,
      );

      if (existingOrder) {
        this.logger.log(
          `Pedido Cicclo ${sale.id} já existe, ignorando`,
        );
        return;
      }

      this.logger.log(`Criando pedido para venda Cicclo ${sale.id}`);

      const orderData = CiccloSaleMapping.toOrder(sale, customer.id, companyId);
      const {
        integratorOrderId,
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
        `Pedido ${order.id} criado com sucesso para venda Cicclo ${sale.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar venda Cicclo ${sale.id}:`,
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
    importDto: CiccloImportHistoricalSalesDto,
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
        `Iniciando importação histórica Cicclo para empresa ${companyId}`,
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
          where: { partnerSlug: 'CICCLO' },
        });

        if (!partner) {
          throw new NotFoundException('Partner CICCLO não encontrado no sistema');
        }

        integration =
          (await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(
            companyId,
            partner.id,
          )) ?? undefined;

        if (!integration) {
          throw new NotFoundException(
            `Integração Cicclo não encontrada para empresa ${companyId}`,
          );
        }
      }

      if (!integration.merchantId || !integration.apiKey) {
        throw new NotFoundException(
          `Código da loja ou senha da API não configurados para empresa ${companyId}`,
        );
      }

      const { startDate, endDate } = resolveImportDateRange(importDto);

      this.logger.log(
        `Período: ${toDateOnlyString(startDate)} até ${toDateOnlyString(endDate)}`,
      );

      const dates = buildUtcDateOnlyRange(startDate, endDate);

      let jobsCreated = 0;
      for (const date of dates) {
        await this.ciccloSalesQueue.add(
          QUEUE_NAMES.CICCLO_SALES_IMPORT,
          { companyId, date },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          },
        );
        jobsCreated++;
      }

      this.logger.log(
        `Importação histórica Cicclo iniciada: ${jobsCreated} jobs criados para empresa ${companyId}`,
      );

      return {
        message: 'Importação histórica Cicclo iniciada com sucesso',
        totalDays: dates.length,
        startDate: toDateOnlyString(startDate),
        endDate: toDateOnlyString(endDate),
        jobsCreated,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao iniciar importação histórica Cicclo para empresa ${companyId}:`,
        error.message,
      );
      throw error;
    }
  }
}
