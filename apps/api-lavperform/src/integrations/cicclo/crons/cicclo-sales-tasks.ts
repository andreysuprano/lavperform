import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { PrismaService } from '../../../prisma/prisma.service';
import { toDateOnlyString } from '../../../common/utils/date.utils';

@Injectable()
export class CiccloSalesTasks {
  private readonly logger = new Logger(CiccloSalesTasks.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.CICCLO_SALES_IMPORT)
    private readonly ciccloSalesQueue: Queue,
  ) {}

  /**
   * Cron a cada 12 horas: enfileira importação de vendas do dia
   * para todas as empresas com integração Cicclo ativa
   */
  @Cron(CronExpression.EVERY_12_HOURS)
  async handleDailySalesImport() {
    this.logger.debug('Iniciando importação de vendas Cicclo');

    try {
      const today = toDateOnlyString(new Date());

      const companies = await this.prisma.company.findMany({
        where: {
          state: 'ACTIVE',
          digitalMenuIntegration: {
            some: {
              active: true,
              partner: { partnerSlug: 'CICCLO' },
            },
          },
        },
        include: {
          digitalMenuIntegration: {
            where: {
              active: true,
              partner: { partnerSlug: 'CICCLO' },
            },
            include: { partner: true },
          },
        },
      });

      this.logger.log(
        `Encontradas ${companies.length} empresas com integração Cicclo`,
      );

      for (const company of companies) {
        await this.ciccloSalesQueue.add(
          QUEUE_NAMES.CICCLO_SALES_IMPORT,
          { companyId: company.id, date: today },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          },
        );

        this.logger.log(
          `Empresa ${company.name} (${company.id}) adicionada à fila de importação Cicclo`,
        );
      }

      this.logger.log(
        `Total de ${companies.length} empresas enfileiradas para importação Cicclo`,
      );
    } catch (error) {
      this.logger.error(
        'Erro ao processar importação de vendas Cicclo:',
        error,
      );
    }
  }
}
