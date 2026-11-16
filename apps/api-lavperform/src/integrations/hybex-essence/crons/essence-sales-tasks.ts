import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { PrismaService } from '../../../prisma/prisma.service';
import { getOpeningHoursTimezone } from '../../../common/utils/date.utils';
import {
  catchupDates,
  salesBackfill90JobId,
  salesCatchupJobId,
} from '../../sales-import/sales-import-schedule';
import {
  buildSalesImportJobOptions,
  enqueueSalesImportJob,
} from '../../sales-import/sales-import-queue';

const PARTNER_SLUG = 'HYBEX_ESSENCE';

@Injectable()
export class HybexEssenceSalesTasks {
  private readonly logger = new Logger(HybexEssenceSalesTasks.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.HYBEX_ESSENCE_SALES_IMPORT)
    private readonly essenceSalesQueue: Queue,
  ) {}

  @Cron('*/30 * * * *')
  async handleDailySalesImport() {
    this.logger.debug('Iniciando importação de vendas Hybex Essence');

    try {
      const now = new Date();
      const { today, yesterday } = catchupDates(now);
      const companies = await this.findActiveCompanies();

      this.logger.log(
        `Encontradas ${companies.length} empresas com integração Hybex Essence`,
      );

      for (const company of companies) {
        for (const date of [today, yesterday]) {
          const result = await enqueueSalesImportJob(
            this.essenceSalesQueue,
            QUEUE_NAMES.HYBEX_ESSENCE_SALES_IMPORT,
            { companyId: company.id, date },
            buildSalesImportJobOptions(
              salesCatchupJobId('essence', company.id, date, now),
            ),
          );

          if (result === 'skipped') {
            this.logger.debug(
              `Importação Essence já enfileirada para ${company.name} (${company.id}) em ${date}`,
            );
            continue;
          }

          this.logger.log(
            `Empresa ${company.name} (${company.id}) adicionada à fila de importação em ${date}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Erro ao processar importação de vendas Hybex Essence:',
        error,
      );
    }
  }

  @Cron('0 3 * * 1', { timeZone: getOpeningHoursTimezone() })
  async handleWeeklyBackfill() {
    this.logger.debug('Iniciando backfill semanal de vendas Hybex Essence');

    try {
      const companies = await this.findActiveCompanies();

      for (const company of companies) {
        const result = await enqueueSalesImportJob(
          this.essenceSalesQueue,
          QUEUE_NAMES.HYBEX_ESSENCE_SALES_IMPORT,
          { companyId: company.id, backfill90: true },
          buildSalesImportJobOptions(
            salesBackfill90JobId('essence', company.id),
          ),
        );

        if (result === 'skipped') {
          this.logger.debug(
            `Backfill Essence já enfileirado para ${company.name} (${company.id})`,
          );
          continue;
        }

        this.logger.log(
          `Empresa ${company.name} (${company.id}) adicionada à fila de reexecução de 7 dias`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Erro ao enfileirar backfill semanal Hybex Essence:',
        error,
      );
    }
  }

  private findActiveCompanies() {
    return this.prisma.company.findMany({
      where: {
        state: 'ACTIVE',
        digitalMenuIntegration: {
          some: {
            active: true,
            partner: { partnerSlug: PARTNER_SLUG },
          },
        },
      },
      include: {
        digitalMenuIntegration: {
          where: {
            active: true,
            partner: { partnerSlug: PARTNER_SLUG },
          },
          include: { partner: true },
        },
      },
    });
  }
}