import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { PrismaService } from '../../../prisma/prisma.service';
import { toDateOnlyString } from '../../../common/utils/date.utils';

@Injectable()
export class MaxlavSalesTasks {
  private readonly logger = new Logger(MaxlavSalesTasks.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.MAXLAV_SALES_IMPORT)
    private readonly maxlavSalesQueue: Queue,
  ) {}

  /**
   * Cron a cada 12 horas: enfileira importação de vendas do dia
   * para todas as empresas com integração Maxlav ativa.
   */
  @Cron(CronExpression.EVERY_12_HOURS)
  async handleDailySalesImport() {
    this.logger.debug('Iniciando importação de vendas Maxlav');

    try {
      const today = toDateOnlyString(new Date());

      const companies = await this.prisma.company.findMany({
        where: {
          state: 'ACTIVE',
          digitalMenuIntegration: {
            some: {
              active: true,
              partner: { partnerSlug: 'MAXLAV' },
            },
          },
        },
        include: {
          digitalMenuIntegration: {
            where: {
              active: true,
              partner: { partnerSlug: 'MAXLAV' },
            },
            include: { partner: true },
          },
        },
      });

      this.logger.log(
        `Encontradas ${companies.length} empresas com integração Maxlav`,
      );

      for (const company of companies) {
        await this.maxlavSalesQueue.add(
          QUEUE_NAMES.MAXLAV_SALES_IMPORT,
          { companyId: company.id, date: today },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          },
        );

        this.logger.log(
          `Empresa ${company.name} (${company.id}) adicionada à fila de importação Maxlav`,
        );
      }

      this.logger.log(
        `Total de ${companies.length} empresas enfileiradas para importação Maxlav`,
      );
    } catch (error) {
      this.logger.error(
        'Erro ao processar importação de vendas Maxlav:',
        error,
      );
    }
  }
}
