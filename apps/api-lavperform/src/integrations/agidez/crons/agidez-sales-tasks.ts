import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { DateTime } from 'luxon';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { PrismaService } from '../../../prisma/prisma.service';
import { getOpeningHoursTimezone } from '../../../common/utils/date.utils';

export function agidezBusinessDate(
  now: Date = new Date(),
  timeZone: string = getOpeningHoursTimezone(),
): string {
  return DateTime.fromJSDate(now, { zone: 'utc' })
    .setZone(timeZone)
    .toISODate()!;
}

export function agidezDailyImportJobId(
  companyId: string,
  now: Date = new Date(),
  timeZone: string = getOpeningHoursTimezone(),
): string {
  const local = DateTime.fromJSDate(now, { zone: 'utc' }).setZone(timeZone);
  return `agidez-daily:${companyId}:${local.toISODate()}:${local.toFormat('HH')}`;
}

@Injectable()
export class AgidezSalesTasks {
  private readonly logger = new Logger(AgidezSalesTasks.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.AGIDEZ_SALES_IMPORT)
    private readonly agidezSalesQueue: Queue,
  ) {}

  /**
   * A cada hora, no horário da loja. O job da meia-noite concluía o dia
   * antes de existir venda, e o Bull recusava a tentativa seguinte
   * porque o jobId do dia já estava completo.
   */
  @Cron('0 8-21 * * *', { timeZone: getOpeningHoursTimezone() })
  async handleDailySalesImport() {
    this.logger.debug('Iniciando importação de vendas Agidez');

    try {
      const now = new Date();
      const today = agidezBusinessDate(now);

      const companies = await this.prisma.company.findMany({
        where: {
          state: 'ACTIVE',
          digitalMenuIntegration: {
            some: {
              active: true,
              partner: { partnerSlug: { in: ['HYBEX', 'AGIDEZ'] } },
            },
          },
        },
        include: {
          digitalMenuIntegration: {
            where: {
              active: true,
              partner: { partnerSlug: { in: ['HYBEX', 'AGIDEZ'] } },
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
            jobId: agidezDailyImportJobId(company.id, now),
          },
        );
      }
    } catch (error) {
      this.logger.error('Erro ao processar importação de vendas Agidez:', error);
    }
  }
}
