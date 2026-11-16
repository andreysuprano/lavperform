import { Injectable, Logger, Optional } from '@nestjs/common';
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
import { RedisService } from '../../../common/redis/redis.service';
import { windelAuthBlockKey } from '../windel-auth-block';
import {
  WINDEL_LOOKBACK_DAYS,
  windelCustomersJobId,
  windelLookbackDates,
  windelLookbackJobId,
} from '../windel-lookback';

@Injectable()
export class WindelSalesTasks {
  private readonly logger = new Logger(WindelSalesTasks.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.WINDEL_SALES_IMPORT)
    private readonly windelSalesQueue: Queue,
    @Optional() private readonly redis?: RedisService,
  ) {}

  /**
   * A cada 30 minutos, enfileira hoje e ontem (UTC) para cada empresa
   * com integração Windel ativa. O jobId inclui o slot de 30 minutos.
   */
  @Cron('*/30 * * * *')
  async handleDailySalesImport() {
    this.logger.debug('Iniciando importação de vendas Windel');

    try {
      const now = new Date();
      const { today, yesterday } = catchupDates(now);
      const companies = await this.findActiveWindelCompanies();

      this.logger.log(
        `Encontradas ${companies.length} empresas com integração Windel`,
      );

      for (const company of companies) {
        if (await this.authIsBlocked(company.id)) {
          this.logger.warn(
            `Login Windel bloqueado para ${company.name} (${company.id})`,
          );
          continue;
        }
        for (const date of [today, yesterday]) {
          const result = await enqueueSalesImportJob(
            this.windelSalesQueue,
            QUEUE_NAMES.WINDEL_SALES_IMPORT,
            {
              companyId: company.id,
              date,
            },
            buildSalesImportJobOptions(
              salesCatchupJobId('windel', company.id, date, now),
            ),
          );

          if (result === 'skipped') {
            this.logger.debug(
              `Importação Windel já enfileirada para ${company.name} (${company.id}) em ${date}`,
            );
            continue;
          }

          this.logger.log(
            `Empresa ${company.name} (${company.id}) adicionada à fila de importação em ${date}`,
          );
        }
      }

      this.logger.log(
        `Total de ${companies.length} empresas adicionadas à fila de importação Windel`,
      );
    } catch (error) {
      this.logger.error(
        'Erro ao processar importação de vendas Windel:',
        error,
      );
    }
  }

  /**
   * Uma vez por dia, relê os últimos 30 dias. A ordem atendida dias depois
   * de aberta entra nesse passe, sem repetir o login a cada meia hora.
   */
  @Cron('15 4 * * *', { timeZone: getOpeningHoursTimezone() })
  async handleLookback() {
    this.logger.debug('Iniciando releitura de 30 dias Windel');

    try {
      const now = new Date();
      const dates = windelLookbackDates(now);
      const companies = await this.findActiveWindelCompanies();

      for (const company of companies) {
        if (await this.authIsBlocked(company.id)) {
          this.logger.warn(
            `Login Windel bloqueado para ${company.name} (${company.id})`,
          );
          continue;
        }
        await enqueueSalesImportJob(
          this.windelSalesQueue,
          QUEUE_NAMES.WINDEL_SALES_IMPORT,
          { companyId: company.id, syncCustomers: true },
          buildSalesImportJobOptions(windelCustomersJobId(company.id, now)),
        );
        for (const date of dates) {
          await enqueueSalesImportJob(
            this.windelSalesQueue,
            QUEUE_NAMES.WINDEL_SALES_IMPORT,
            { companyId: company.id, date },
            buildSalesImportJobOptions(
              windelLookbackJobId(company.id, date, now),
            ),
          );
        }
      }

      this.logger.log(
        `Releitura de ${WINDEL_LOOKBACK_DAYS} dias enfileirada para ${companies.length} empresas Windel`,
      );
    } catch (error) {
      this.logger.error('Erro ao enfileirar releitura Windel:', error);
    }
  }

  /**
   * Segunda-feira às 03:00 no fuso de funcionamento, enfileira a reexecução
   * dos últimos 30 dias. Um job por empresa; colisão ativa é ignorada.
   */
  @Cron('0 3 * * 1', { timeZone: getOpeningHoursTimezone() })
  async handleWeeklyBackfill() {
    this.logger.debug('Iniciando backfill semanal de vendas Windel');

    try {
      const companies = await this.findActiveWindelCompanies();

      this.logger.log(
        `Encontradas ${companies.length} empresas com integração Windel para backfill`,
      );

      for (const company of companies) {
        if (await this.authIsBlocked(company.id)) {
          this.logger.warn(
            `Login Windel bloqueado para ${company.name} (${company.id})`,
          );
          continue;
        }
        const result = await enqueueSalesImportJob(
          this.windelSalesQueue,
          QUEUE_NAMES.WINDEL_SALES_IMPORT,
          {
            companyId: company.id,
            backfill90: true,
          },
          buildSalesImportJobOptions(
            salesBackfill90JobId('windel', company.id),
          ),
        );

        if (result === 'skipped') {
          this.logger.debug(
            `Backfill Windel já enfileirado para ${company.name} (${company.id})`,
          );
          continue;
        }

        this.logger.log(
          `Empresa ${company.name} (${company.id}) adicionada à fila de reexecução de 30 dias`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Erro ao enfileirar backfill semanal de vendas Windel:',
        error,
      );
    }
  }

  private async authIsBlocked(companyId: string): Promise<boolean> {
    const blocked = await this.redis?.getJson(windelAuthBlockKey(companyId));
    return Boolean(blocked);
  }

  private findActiveWindelCompanies() {
    return this.prisma.company.findMany({
      where: {
        state: 'ACTIVE',
        digitalMenuIntegration: {
          some: {
            active: true,
            partner: {
              partnerSlug: 'WINDEL',
            },
          },
        },
      },
      include: {
        digitalMenuIntegration: {
          where: {
            active: true,
            partner: {
              partnerSlug: 'WINDEL',
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
