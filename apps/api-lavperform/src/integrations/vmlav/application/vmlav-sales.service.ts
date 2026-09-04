import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { VmLavService } from '../api/vmlav.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { VmLavCustomerDetail, VmLavSale } from '../api/vmlav.types';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { IDigitalMenuIntegrationRepository } from '../../../partners/domain/digital-menu-integration.repository.interface';
import { toDateOnlyString } from '../../../common/utils/date.utils';
import {
  buildUtcDateOnlyRange,
  resolveImportDateRange,
} from '../../import-date-range.util';
import { DigitalMenuIntegration } from '../../../partners/domain/digital-menu-integration.entity';
import { ImportHistoricalSalesDto } from './dto/import-historical-sales.dto';
import { OrderIngestionService } from '../../../public-api/orders/application/order-ingestion.service';
import {
  isVmLavSaleReadyForIngestion,
  mapVmLavSaleToIngestOrder,
} from '../mappings/vmlav-to-ingest-order.mapper';
import {
  VMLAV_INGESTION_API_KEY_ID,
  VMLAV_PARTNER_SLUG,
} from '../vmlav.constants';
import {
  buildVmLavImportJobOptions,
  buildVmLavSaleJobOptions,
  enqueueVmLavJob,
  vmlavImportJobId,
  vmlavSaleJobId,
} from '../vmlav-queue.util';

@Injectable()
export class VmLavSalesService {
  private readonly logger = new Logger(VmLavSalesService.name);

  constructor(
    private readonly vmLavService: VmLavService,
    private readonly prisma: PrismaService,
    @Inject('IDigitalMenuIntegrationRepository')
    private readonly digitalMenuIntegrationRepository: IDigitalMenuIntegrationRepository,
    private readonly orderIngestionService: OrderIngestionService,
    @InjectQueue(QUEUE_NAMES.VMLAV_SALES_IMPORT)
    private readonly vmLavSalesQueue: Queue,
    @InjectQueue(QUEUE_NAMES.VMLAV_SALE_PROCESS)
    private readonly vmLavSaleProcessQueue: Queue,
  ) {}

  /**
   * Processa as vendas do dia para uma empresa específica
   * Busca as vendas na API e adiciona cada uma na fila para processamento
   * @param companyId - ID da empresa
   * @param date - Data das vendas no formato ISO (YYYY-MM-DD)
   */
  async processDailySales(companyId: string, date: string): Promise<void> {
    try {
      this.logger.log(
        `Iniciando processamento de vendas para empresa ${companyId} - ${date}`,
      );

      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new Error(`Empresa ${companyId} não encontrada`);
      }

      const partner = await this.prisma.partner.findUnique({
        where: { partnerSlug: VMLAV_PARTNER_SLUG },
      });

      if (!partner) {
        throw new Error('Partner VMLAV não encontrado no sistema');
      }

      const integration = await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(
        companyId,
        partner.id,
      );

      if (!integration) {
        this.logger.warn(`Integração VM Lav não encontrada para empresa ${companyId}`);
        return;
      }

      if (!integration.apiKey) {
        this.logger.warn(`API Key não configurada para empresa ${companyId}`);
        return;
      }

      if (!company.cnpj) {
        this.logger.warn(`CNPJ não configurado para empresa ${companyId}`);
        return;
      }

      this.logger.log(`Integração encontrada. Buscando vendas na API...`);

      const sales = await this.vmLavService.getDailySales(
        integration.apiKey,
        company.cnpj,
        date,
      );

      this.logger.log(`Encontradas ${sales.length} vendas para processar`);

      for (const sale of sales) {
        const result = await enqueueVmLavJob(
          this.vmLavSaleProcessQueue,
          QUEUE_NAMES.VMLAV_SALE_PROCESS,
          {
            companyId,
            sale,
            apiKey: integration.apiKey,
            partnerId: partner.id,
          },
          buildVmLavSaleJobOptions(vmlavSaleJobId(companyId, sale.idVenda)),
        );

        if (result === 'skipped') {
          this.logger.debug(
            `Venda ${sale.idVenda} já enfileirada para empresa ${companyId}`,
          );
        }
      }

      this.logger.log(
        `${sales.length} vendas adicionadas à fila de processamento para empresa ${companyId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar vendas para empresa ${companyId}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Enriquece a venda (quando possível) e enfileira na ingestão da API aberta,
   * reutilizando as mesmas regras de cliente/pedido.
   */
  async processSale(
    companyId: string,
    sale: VmLavSale,
    apiKey?: string,
    partnerId?: string,
  ): Promise<void> {
    try {
      this.logger.log(`Processando venda ${sale.idVenda} - Cliente: ${sale.nomeCliente}`);

      if (!isVmLavSaleReadyForIngestion(sale)) {
        this.logger.warn(
          `Venda ${sale.idVenda} incompleta para ingestão (sem nome), ignorando`,
        );
        return;
      }

      let resolvedPartnerId = partnerId;
      if (!resolvedPartnerId) {
        const partner = await this.prisma.partner.findUnique({
          where: { partnerSlug: VMLAV_PARTNER_SLUG },
          select: { id: true },
        });
        if (!partner) {
          throw new Error('Partner VMLAV não encontrado no sistema');
        }
        resolvedPartnerId = partner.id;
      }

      let customerDetail: VmLavCustomerDetail | null = null;
      if (sale.cpfCliente && apiKey) {
        customerDetail = await this.vmLavService.getCustomerByCpf(
          apiKey,
          sale.cpfCliente,
        );
        if (customerDetail) {
          this.logger.log(
            `Dados detalhados do cliente encontrados na API: ${customerDetail.nome}`,
          );
        }
      }

      const ingestPayload = mapVmLavSaleToIngestOrder(
        sale,
        resolvedPartnerId,
        customerDetail,
      );

      if (!ingestPayload) {
        this.logger.warn(
          `Falha ao mapear venda ${sale.idVenda} para ingestão; ignorando`,
        );
        return;
      }

      const result = await this.orderIngestionService.enqueue(
        {
          apiKeyId: VMLAV_INGESTION_API_KEY_ID,
          companyId,
        },
        ingestPayload,
      );

      this.logger.log(
        `Venda VM Lav ${sale.idVenda} ${result.status} na fila public-api-order-ingestion ` +
          `para empresa ${companyId}`,
      );
    } catch (error) {
      this.logger.error(`Erro ao processar venda ${sale.idVenda}:`, error.message);
      throw error;
    }
  }

  /**
   * Importa vendas históricas retroativas (últimos 3 meses ou período customizado)
   * Útil para onboarding de novos clientes
   * @param companyId - ID da empresa
   * @param importDto - Dados da importação (datas opcionais)
   */
  async importHistoricalSales(
    companyId: string,
    importDto: ImportHistoricalSalesDto,
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
        `Iniciando importação histórica de vendas para empresa ${companyId}`,
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
          where: { partnerSlug: VMLAV_PARTNER_SLUG },
        });

        if (!partner) {
          throw new NotFoundException('Partner VMLAV não encontrado no sistema');
        }

        integration =
          (await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(
            companyId,
            partner.id,
          )) ?? undefined;

        if (!integration) {
          throw new NotFoundException(
            `Integração VM Lav não encontrada para empresa ${companyId}`,
          );
        }
      }

      if (!integration.apiKey) {
        throw new NotFoundException(
          `API Key não configurada para empresa ${companyId}`,
        );
      }

      const { startDate, endDate } = resolveImportDateRange(importDto);

      this.logger.log(
        `Período de importação: ${toDateOnlyString(startDate)} até ${toDateOnlyString(endDate)}`,
      );

      const dates = buildUtcDateOnlyRange(startDate, endDate);

      this.logger.log(`Total de ${dates.length} dias para importar`);

      let jobsCreated = 0;
      for (const date of dates) {
        const result = await enqueueVmLavJob(
          this.vmLavSalesQueue,
          QUEUE_NAMES.VMLAV_SALES_IMPORT,
          {
            companyId,
            date,
          },
          buildVmLavImportJobOptions(vmlavImportJobId(companyId, date)),
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
        `Importação histórica iniciada: ${jobsCreated} jobs criados para empresa ${companyId}`,
      );

      return {
        message: 'Importação histórica iniciada com sucesso',
        totalDays: dates.length,
        startDate: toDateOnlyString(startDate),
        endDate: toDateOnlyString(endDate),
        jobsCreated,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao iniciar importação histórica para empresa ${companyId}:`,
        error.message,
      );
      throw error;
    }
  }
}
