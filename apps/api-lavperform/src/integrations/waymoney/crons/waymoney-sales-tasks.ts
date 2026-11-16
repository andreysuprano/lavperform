import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { PrismaService } from '../../../prisma/prisma.service';
import { getOpeningHoursTimezone } from '../../../common/utils/date.utils';
import {
  salesBackfill90JobId,
  salesCatchupJobId,
} from '../../sales-import/sales-import-schedule';
import {
  buildSalesImportJobOptions,
  enqueueSalesImportJob,
} from '../../sales-import/sales-import-queue';
import { RedisService } from '../../../common/redis/redis.service';
import { waymoneyAuthBlockKey } from '../waymoney-auth-block';
import { waymoneyCatchupDates } from '../waymoney-day';

@Injectable()
export class WaymoneySalesTasks {
  private readonly logger = new Logger(WaymoneySalesTasks.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.WAYMONEY_SALES_IMPORT)
    private readonly waymoneySalesQueue: Queue,
    @Optional() private readonly redis?: RedisService,
  ) {}

  @Cron('*/30 * * * *')
  async handleDailySalesImport() {
    try {
      const now = new Date();
      const { today, yesterday } = waymoneyCatchupDates(now);
      const companies = await this.findActiveCompanies();

      for (const company of companies) {
        if (await this.authIsBlocked(company.id)) {
          this.logger.warn(
            `Login WayMoney bloqueado para ${company.name} (${company.id})`,
          );
          continue;
        }
        for (const date of [today, yesterday]) {
          await enqueueSalesImportJob(
            this.waymoneySalesQueue,
            QUEUE_NAMES.WAYMONEY_SALES_IMPORT,
            { companyId: company.id, date },
            buildSalesImportJobOptions(
              salesCatchupJobId('waymoney', company.id, date, now),
            ),
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Erro ao processar importação de vendas WayMoney:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  @Cron('0 3 * * 1', { timeZone: getOpeningHoursTimezone() })
  async handleWeeklyBackfill() {
    try {
      const companies = await this.findActiveCompanies();
      for (const company of companies) {
        if (await this.authIsBlocked(company.id)) {
          continue;
        }
        await enqueueSalesImportJob(
          this.waymoneySalesQueue,
          QUEUE_NAMES.WAYMONEY_SALES_IMPORT,
          { companyId: company.id, backfill90: true },
          buildSalesImportJobOptions(
            salesBackfill90JobId('waymoney', company.id),
          ),
        );
      }
    } catch (error) {
      this.logger.error(
        'Erro ao enfileirar backfill semanal de vendas WayMoney:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  private async authIsBlocked(companyId: string): Promise<boolean> {
    const blocked = await this.redis?.getJson(waymoneyAuthBlockKey(companyId));
    return Boolean(blocked);
  }

  private findActiveCompanies() {
    return this.prisma.company.findMany({
      where: {
        state: 'ACTIVE',
        digitalMenuIntegration: {
          some: {
            active: true,
            partner: { partnerSlug: 'WAYMONEY' },
          },
        },
      },
    });
  }
}
