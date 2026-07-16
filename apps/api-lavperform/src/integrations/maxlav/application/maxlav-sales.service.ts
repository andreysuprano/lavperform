import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { MaxlavService } from '../api/maxlav.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MaxlavOrder } from '../api/maxlav.types';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { IDigitalMenuIntegrationRepository } from '../../../partners/domain/digital-menu-integration.repository.interface';
import { CustomersService } from '../../../customers/application/customers.service';
import { OrderService } from '../../../orders/application/order.service';
import { formatPhoneNumber } from '../../../common/utils/formatters';
import { parseUTCDate, toDateOnlyString } from '../../../common/utils/date.utils';
import {
  buildUtcDateOnlyRange,
  resolveImportDateRange,
} from '../../import-date-range.util';
import { DigitalMenuIntegration } from '../../../partners/domain/digital-menu-integration.entity';
import { MaxlavSaleMapping } from '../mappings/maxlav-sale-mapping';
import { MaxlavCustomerMapping } from '../mappings/maxlav-customer-mapping';
import { MaxlavImportHistoricalSalesDto } from './dto/import-historical-sales.dto';

const PARTNER_SLUG = 'MAXLAV';

@Injectable()
export class MaxlavSalesService {
  private readonly logger = new Logger(MaxlavSalesService.name);

  constructor(
    private readonly maxlavService: MaxlavService,
    private readonly prisma: PrismaService,
    @Inject('IDigitalMenuIntegrationRepository')
    private readonly digitalMenuIntegrationRepository: IDigitalMenuIntegrationRepository,
    private readonly customersService: CustomersService,
    private readonly orderService: OrderService,
    @InjectQueue(QUEUE_NAMES.MAXLAV_SALES_IMPORT)
    private readonly maxlavSalesQueue: Queue,
    @InjectQueue(QUEUE_NAMES.MAXLAV_SALE_PROCESS)
    private readonly maxlavSaleProcessQueue: Queue,
  ) {}

  // ─── helpers ──────────────────────────────────────────────────────────────

  private async resolveIntegration(companyId: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { partnerSlug: PARTNER_SLUG },
    });

    if (!partner) {
      throw new Error(`Partner ${PARTNER_SLUG} não encontrado no sistema`);
    }

    const integration =
      await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(
        companyId,
        partner.id,
      );

    if (!integration) {
      this.logger.warn(
        `Integração Maxlav não encontrada para empresa ${companyId}`,
      );
      return null;
    }

    if (!integration.apiKey) {
      this.logger.warn(
        `Token de API (apiKey) não configurado para empresa ${companyId}`,
      );
      return null;
    }

    return integration;
  }

  // ─── cron entry point ─────────────────────────────────────────────────────

  /**
   * Busca todos os pedidos de um dia e enfileira cada um individualmente.
   * Chamado pelo processor da fila MAXLAV_SALES_IMPORT (disparada pelo cron).
   */
  async processDailySales(companyId: string, date: string): Promise<void> {
    try {
      this.logger.log(
        `Iniciando processamento de vendas Maxlav para empresa ${companyId} - ${date}`,
      );

      const integration = await this.resolveIntegration(companyId);
      if (!integration) return;

      const orders = await this.maxlavService.getDailySales(
        integration.apiKey!,
        date,
      );

      this.logger.log(
        `${orders.length} pedidos Maxlav encontrados para empresa ${companyId} - ${date}`,
      );

      for (const order of orders) {
        await this.maxlavSaleProcessQueue.add(
          QUEUE_NAMES.MAXLAV_SALE_PROCESS,
          { companyId, order },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
          },
        );
      }

      this.logger.log(
        `${orders.length} pedidos Maxlav adicionados à fila de processamento para empresa ${companyId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar vendas Maxlav para empresa ${companyId} - ${date}:`,
        error.message,
      );
      throw error;
    }
  }

  // ─── individual sale processing ───────────────────────────────────────────

  /**
   * Processa um pedido individual: upsert do cliente e criação do pedido.
   */
  async processSale(companyId: string, order: MaxlavOrder): Promise<void> {
    try {
      this.logger.log(
        `Processando pedido Maxlav ${order.id} - Cliente: ${order.customer?.fullName}`,
      );

      const maxlavCustomer = order.customer;

      if (!maxlavCustomer?.cellphone) {
        this.logger.warn(
          `Pedido ${order.id} sem telefone do cliente, ignorando`,
        );
        return;
      }

      const phoneFormatted = formatPhoneNumber(maxlavCustomer.cellphone);

      let customer = await this.customersService.findByPhone(
        companyId,
        phoneFormatted,
      );

      if (!customer) {
        this.logger.log(
          `Cliente não encontrado pelo telefone ${phoneFormatted}, criando novo...`,
        );

        const customerData = MaxlavCustomerMapping.toCreateCustomerDto(
          maxlavCustomer,
          order.createdAt,
        );

        customer = await this.customersService.create(companyId, customerData);
        this.logger.log(`Cliente Maxlav criado com sucesso: ${customer.id}`);
      } else {
        this.logger.log(`Cliente já existe: ${customer.id} - ${customer.name}`);

        const needsUpdate = maxlavCustomer.documentId && !customer.cpf;
        if (needsUpdate) {
          const updateData = MaxlavCustomerMapping.toUpdateData(maxlavCustomer);
          await this.customersService.update(companyId, customer.id, updateData);
          this.logger.log(`Cliente ${customer.id} atualizado com sucesso`);
        }
      }

      const integratorOrderId = MaxlavSaleMapping.getIntegratorOrderId(order.id);

      const existingOrder = await this.orderService.findByIntegratorOrderId(
        companyId,
        integratorOrderId,
      );

      if (existingOrder) {
        this.logger.log(`Pedido Maxlav ${order.id} já existe, ignorando`);
        return;
      }

      this.logger.log(`Criando pedido para venda Maxlav ${order.id}`);

      const orderData = MaxlavSaleMapping.toOrder(order, customer.id, companyId);
      const {
        integratorOrderId: _integratorOrderId,
        items,
        discounts,
        payments,
        deliveryAddress,
        schedule,
        ...orderCreateData
      } = orderData;

      const saleDate = parseUTCDate(order.createdAt);

      const createdOrder = await this.orderService.create({
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
        `Pedido ${createdOrder.id} criado com sucesso para venda Maxlav ${order.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar pedido Maxlav ${order.id}:`,
        error.message,
      );
      throw error;
    }
  }

  // ─── historical import ────────────────────────────────────────────────────

  /**
   * Importa vendas históricas retroativas (padrão: 90 dias).
   * Enfileira um job por dia no intervalo especificado.
   */
  async importHistoricalSales(
    companyId: string,
    importDto: MaxlavImportHistoricalSalesDto,
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
        `Iniciando importação histórica Maxlav para empresa ${companyId}`,
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
          where: { partnerSlug: PARTNER_SLUG },
        });

        if (!partner) {
          throw new NotFoundException(
            `Partner ${PARTNER_SLUG} não encontrado no sistema`,
          );
        }

        integration =
          (await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(
            companyId,
            partner.id,
          )) ?? undefined;

        if (!integration) {
          throw new NotFoundException(
            `Integração Maxlav não encontrada para empresa ${companyId}`,
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
        await this.maxlavSalesQueue.add(
          QUEUE_NAMES.MAXLAV_SALES_IMPORT,
          { companyId, date },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          },
        );
        jobsCreated++;
      }

      this.logger.log(
        `Importação histórica Maxlav iniciada: ${jobsCreated} jobs criados para empresa ${companyId}`,
      );

      return {
        message: 'Importação histórica Maxlav iniciada com sucesso',
        totalDays: dates.length,
        startDate: toDateOnlyString(startDate),
        endDate: toDateOnlyString(endDate),
        jobsCreated,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao iniciar importação histórica Maxlav para empresa ${companyId}:`,
        error.message,
      );
      throw error;
    }
  }
}
