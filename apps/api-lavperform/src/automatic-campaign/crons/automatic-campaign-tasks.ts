import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { AutomaticCampaignStatus } from '@prisma/client';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { nowUTC, startOfDayInTz } from '../../common/utils/date.utils';

@Injectable()
export class AutomaticCampaignTasks {
  private readonly logger = new Logger(AutomaticCampaignTasks.name);

  constructor(private readonly prisma: PrismaService, @InjectQueue(QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE) private readonly automaticCampaignsQueue: Queue) { }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleAutomaticCampaign() {
    this.logger.debug('Processando campanhas automáticas');

    const now = nowUTC();
    // "Hoje" calculado no fuso do estabelecimento para não re-processar no
    // turno noturno (após 21h SP), quando UTC já avançou para o dia seguinte.
    const startOfToday = startOfDayInTz(now);

    // Para o filtro de endDate usamos meia-noite UTC, pois as datas são
    // salvas como 00:00:00 UTC no banco. Usar startOfToday (SP = 03:00 UTC)
    // excluiria campanhas cujo endDate é hoje mas foi salvo às 00:00 UTC.
    const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    this.logger.log(`Buscando campanhas automáticas ativas para hoje (${startOfToday.toISOString()})`);

    try {
      const automaticCampaigns = await this.prisma.automaticCampaign.findMany({
        where: {
          status: {
            in: [
              AutomaticCampaignStatus.PROCESSING,
              AutomaticCampaignStatus.IN_PROGRESS,
            ],
          },
          startDate: { lte: now },
          deletedAt: null,
          AND: [
            {
              OR: [
                { endDate: { gte: startOfTodayUTC } },
                { endDate: null },
              ],
            },
            {
              OR: [
                { lastProcessedAt: { lte: startOfToday } },
                { lastProcessedAt: null },
              ],
            },
          ],
        },
      });

      this.logger.log(`Foram encontradas ${automaticCampaigns.length} campanhas automaticas ativas a não processadas hoje!`);

      await this.prisma.cron_automatic_campaign.create({
        data: {
          campaignsFound: automaticCampaigns.length,
        }
      });

      if (automaticCampaigns.length > 0) {

        const todayStr = startOfToday.toISOString().slice(0, 10);

        for (const campaign of automaticCampaigns) {
          const jobId = `automatic-campaign:${campaign.id}:${todayStr}`;

          await this.prisma.automaticCampaign.update({
            where: { id: campaign.id },
            data: { lastProcessedAt: nowUTC() }
          });

          await this.automaticCampaignsQueue.add(
            QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE,
            { automaticCampaignId: campaign.id },
            { jobId }
          );

          this.logger.log(`Campanha ${campaign.name} (ID: ${campaign.id}) enviada para processamento`);
        }

        this.logger.log('Todas as campanhas foram enviadas para processamento');
      }

    } catch (error) {
      this.logger.error('Erro ao processar campanhas automáticas:', error);
    }
  }

  /**
   * Todo dia 00:30 marca como COMPLETED e desativa campanhas cujo endDate já venceu.
   */
  @Cron('30 0 * * *')
  async handleEndedCampaigns() {
    this.logger.log('Verificando campanhas automáticas encerradas');

    try {
      const now = nowUTC();

      const { count } = await this.prisma.automaticCampaign.updateMany({
        where: {
          endDate: { lt: now },
          status: { not: AutomaticCampaignStatus.COMPLETED },
          deletedAt: null,
        },
        data: {
          status: AutomaticCampaignStatus.COMPLETED,
          active: false,
        },
      });

      this.logger.log(`Encerradas ${count} campanhas cujo endDate venceu`);
    } catch (error) {
      this.logger.error('Erro ao encerrar campanhas vencidas:', error);
    }
  }
}
