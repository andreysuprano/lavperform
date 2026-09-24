import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { PrismaService } from '../../../prisma/prisma.service';
import { toDateOnlyString } from '../../../common/utils/date.utils';

@Injectable()
export class AgidezSalesTasks {
  private readonly logger = new Logger(AgidezSalesTasks.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.AGIDEZ_SALES_IMPORT)
    private readonly agidezSalesQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_12_HOURS)
  async handleDailySalesImport() {
    this.logger.debug('Iniciando importação de vendas Agidez');

    try {
      const today = toDateOnlyString(new Date());

      const companies = await this.prisma.company.findMany({
        where: {
          state: 'ACTIVE',
          digitalMenuIntegration: {
            some: {
              active: true,
              partner: { partnerSlug: 'AGIDEZ' },
            },
          },
        },
        include: {
          digitalMenuIntegration: {
            where: {
              active: true,
              partner: { partnerSlug: 'AGIDEZ' },
            },
            include: { partner: true },
          },
        },
      });

      this.logger.log(
        `Encontradas ${companies.length} empresas com integração Agidez`,
      );

      for (const company of companies) {
        await this.agidezSalesQueue.add(
          QUEUE_NAMES.AGIDEZ_SALES_IMPORT,
          { companyId: company.id, date: today },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            jobId: `agidez-import:${company.id}:${today}`,
          },
        );
      }
    } catch (error) {
      this.logger.error('Erro ao processar importação de vendas Agidez:', error);
    }
  }
}
