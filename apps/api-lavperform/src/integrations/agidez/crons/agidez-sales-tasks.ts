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

const AGIDEZ_PARTNER_SLUGS = ['HYBEX', 'AGIDEZ'] as const;

@Injectable()
export class AgidezSalesTasks {
  private readonly logger = new Logger(AgidezSalesTasks.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.AGIDEZ_SALES_IMPORT)
    private readonly agidezSalesQueue: Queue,
  ) {}

  /**
   * A cada 30 minutos, enfileira hoje e ontem (UTC) para cada empresa
   * com integração Agidez ativa. O jobId inclui o slot de 30 minutos.
   */
  @Cron('*/30 * * * *')
  async handleDailySalesImport() {
    this.logger.debug('Iniciando importação de vendas Agidez');

    try {
      const now = new Date();
      const { today, yesterday } = catchupDates(now);
      const companies = await this.findActiveAgidezCompanies();

      this.logger.log(
        `Encontradas ${companies.length} empresas com integração Agidez`,
      );

      for (const company of companies) {
        for (const date of [today, yesterday]) {
          const result = await enqueueSalesImportJob(
            this.agidezSalesQueue,
            QUEUE_NAMES.AGIDEZ_SALES_IMPORT,
            {
              companyId: company.id,
              date,
            },
            buildSalesImportJobOptions(
              salesCatchupJobId('agidez', company.id, date, now),
            ),
          );

          if (result === 'skipped') {
            this.logger.debug(
              `Importação Agidez já enfileirada para ${company.name} (${company.id}) em ${date}`,
            );
            continue;
          }

          this.logger.log(
            `Empresa ${company.name} (${company.id}) adicionada à fila de importação em ${date}`,
          );
        }
      }

      this.logger.log(
        `Total de ${companies.length} empresas adicionadas à fila de importação Agidez`,
      );
    } catch (error) {
      this.logger.error(
        'Erro ao processar importação de vendas Agidez:',
        error,
      );
    }
  }

  /**
   * Segunda-feira às 03:00 no fuso de funcionamento, enfileira o backfill
   * de 90 dias. Um job por empresa; colisão ativa é ignorada.
   */
  @Cron('0 3 * * 1', { timeZone: getOpeningHoursTimezone() })
  async handleWeeklyBackfill() {
    this.logger.debug('Iniciando backfill semanal de vendas Agidez');

    try {
      const companies = await this.findActiveAgidezCompanies();

      this.logger.log(
        `Encontradas ${companies.length} empresas com integração Agidez para backfill`,
      );

      for (const company of companies) {
        const result = await enqueueSalesImportJob(
          this.agidezSalesQueue,
          QUEUE_NAMES.AGIDEZ_SALES_IMPORT,
          {
            companyId: company.id,
            backfill90: true,
          },
          buildSalesImportJobOptions(
            salesBackfill90JobId('agidez', company.id),
          ),
        );

        if (result === 'skipped') {
          this.logger.debug(
            `Backfill Agidez já enfileirado para ${company.name} (${company.id})`,
          );
          continue;
        }

        this.logger.log(
          `Empresa ${company.name} (${company.id}) adicionada à fila de backfill de 90 dias`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Erro ao enfileirar backfill semanal de vendas Agidez:',
        error,
      );
    }
  }

  private findActiveAgidezCompanies() {
    return this.prisma.company.findMany({
      where: {
        state: 'ACTIVE',
        digitalMenuIntegration: {
          some: {
            active: true,
            partner: {
              partnerSlug: { in: [...AGIDEZ_PARTNER_SLUGS] },
            },
          },
        },
      },
      include: {
        digitalMenuIntegration: {
          where: {
            active: true,
            partner: {
              partnerSlug: { in: [...AGIDEZ_PARTNER_SLUGS] },
            },
          },
          include: {
            partner: true,
          },
        },
      },
    });
  }
}
