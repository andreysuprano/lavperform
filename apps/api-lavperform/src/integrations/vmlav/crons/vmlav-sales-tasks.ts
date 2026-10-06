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

@Injectable()
export class VmLavSalesTasks {
  private readonly logger = new Logger(VmLavSalesTasks.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.VMLAV_SALES_IMPORT)
    private readonly vmLavSalesQueue: Queue,
  ) {}

  /**
   * A cada 30 minutos, enfileira hoje e ontem (UTC) para cada empresa
   * com integração VM Lav ativa. O jobId inclui o slot de 30 minutos.
   */
  @Cron('*/30 * * * *')
  async handleDailySalesImport() {
    this.logger.debug('Iniciando importação de vendas VM Lav');

    try {
      const now = new Date();
      const { today, yesterday } = catchupDates(now);
      const companies = await this.findActiveVmLavCompanies();

      this.logger.log(
        `Encontradas ${companies.length} empresas com integração VM Lav`,
      );

      for (const company of companies) {
        for (const date of [today, yesterday]) {
          const result = await enqueueSalesImportJob(
            this.vmLavSalesQueue,
            QUEUE_NAMES.VMLAV_SALES_IMPORT,
            {
              companyId: company.id,
              date,
            },
            buildSalesImportJobOptions(
              salesCatchupJobId('vmlav', company.id, date, now),
            ),
          );

          if (result === 'skipped') {
            this.logger.debug(
              `Importação VM Lav já enfileirada para ${company.name} (${company.id}) em ${date}`,
            );
            continue;
          }

          this.logger.log(
            `Empresa ${company.name} (${company.id}) adicionada à fila de importação em ${date}`,
          );
        }
      }

      this.logger.log(
        `Total de ${companies.length} empresas adicionadas à fila de importação VM Lav`,
      );
    } catch (error) {
      this.logger.error(
        'Erro ao processar importação de vendas VM Lav:',
        error,
      );
    }
  }

  /**
   * Segunda-feira às 03:00 no fuso de funcionamento, enfileira a reexecução
   * dos últimos 7 dias. Um job por empresa; colisão ativa é ignorada.
   */
  @Cron('0 3 * * 1', { timeZone: getOpeningHoursTimezone() })
  async handleWeeklyBackfill() {
    this.logger.debug('Iniciando backfill semanal de vendas VM Lav');

    try {
      const companies = await this.findActiveVmLavCompanies();

      this.logger.log(
        `Encontradas ${companies.length} empresas com integração VM Lav para backfill`,
      );

      for (const company of companies) {
        const result = await enqueueSalesImportJob(
          this.vmLavSalesQueue,
          QUEUE_NAMES.VMLAV_SALES_IMPORT,
          {
            companyId: company.id,
            backfill90: true,
          },
          buildSalesImportJobOptions(salesBackfill90JobId('vmlav', company.id)),
        );

        if (result === 'skipped') {
          this.logger.debug(
            `Backfill VM Lav já enfileirado para ${company.name} (${company.id})`,
          );
          continue;
        }

        this.logger.log(
          `Empresa ${company.name} (${company.id}) adicionada à fila de reexecução de 7 dias`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Erro ao enfileirar backfill semanal de vendas VM Lav:',
        error,
      );
    }
  }

  private findActiveVmLavCompanies() {
    return this.prisma.company.findMany({
      where: {
        state: 'ACTIVE',
        digitalMenuIntegration: {
          some: {
            active: true,
            partner: {
              partnerSlug: 'VMLAV',
            },
          },
        },
      },
      include: {
        digitalMenuIntegration: {
          where: {
            active: true,
            partner: {
              partnerSlug: 'VMLAV',
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
