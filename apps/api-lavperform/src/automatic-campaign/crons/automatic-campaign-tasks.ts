import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { AutomaticCampaignStatus } from '@prisma/client';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { PrismaService } from '../../prisma/prisma.service';
import {
  campaignEndDateMinInclusive,
  getOpeningHoursTimezone,
  nowUTC,
  startOfDayInTz,
} from '../../common/utils/date.utils';

@Injectable()
export class AutomaticCampaignTasks {
  private readonly logger = new Logger(AutomaticCampaignTasks.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE)
    private readonly automaticCampaignsQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleAutomaticCampaign() {
    this.logger.debug('Processando campanhas automáticas');

    const now = nowUTC();
    // "Hoje" calculado no fuso do estabelecimento para não re-processar no
    // turno noturno (após 21h SP), quando UTC já avançou para o dia seguinte.
    const startOfToday = startOfDayInTz(now);

    // endDate legado (T00:00:00.000Z) e novo (fim do dia SP) são tratados
    // pelo limite inclusivo baseado no dia civil em America/Sao_Paulo.
    const endDateMinInclusive = campaignEndDateMinInclusive(now);

    this.logger.log(
      `Buscando campanhas automáticas ativas para hoje (${startOfToday.toISOString()})`,
    );

    try {
      const automaticCampaigns = await this.prisma.automaticCampaign.findMany({
        where: {
          active: true,
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
                { endDate: { gte: endDateMinInclusive } },
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

      this.logger.log(
        `Foram encontradas ${automaticCampaigns.length} campanhas automaticas ativas a não processadas hoje!`,
      );

      await this.prisma.cron_automatic_campaign.create({
        data: {
          campaignsFound: automaticCampaigns.length,
        },
      });

      if (automaticCampaigns.length > 0) {
        const todayStr = startOfToday.toISOString().slice(0, 10);

        for (const campaign of automaticCampaigns) {
          const jobId = `automatic-campaign:${campaign.id}:${todayStr}`;

          // lastProcessedAt é marcado no processor apenas em decisões definitivas
          // do dia (sucesso, dia da semana fora, limite diário). Sem janela de
          // horário, a campanha fica elegível para retry no mesmo dia.
          try {
            await this.automaticCampaignsQueue.add(
              QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE,
              { automaticCampaignId: campaign.id },
              {
                jobId,
                removeOnComplete: true,
                removeOnFail: true,
              },
            );

            this.logger.log(
              `Campanha ${campaign.name} (ID: ${campaign.id}) enviada para processamento`,
            );
          } catch (error) {
            // Job com o mesmo jobId ainda na fila / em processamento.
            this.logger.debug(
              `Campanha ${campaign.id} já possui job ${jobId} na fila: ${error}`,
            );
          }
        }

        this.logger.log('Todas as campanhas foram enviadas para processamento');
      }
    } catch (error) {
      this.logger.error('Erro ao processar campanhas automáticas:', error);
    }
  }

  /**
   * Todo dia 00:30 (America/Sao_Paulo) marca como COMPLETED e desativa
   * campanhas cujo dia civil de endDate já passou.
   */
  @Cron('30 0 * * *', { timeZone: 'America/Sao_Paulo' })
  async handleEndedCampaigns() {
    this.logger.log('Verificando campanhas automáticas encerradas');

    try {
      const now = nowUTC();
      const startOfTodaySp = startOfDayInTz(now, getOpeningHoursTimezone());

      const { count } = await this.prisma.automaticCampaign.updateMany({
        where: {
          endDate: { lt: startOfTodaySp },
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
