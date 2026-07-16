import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CampaignStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { nowUTC } from '../../common/utils/date.utils';

@Injectable()
export class ScheduledCampaignTasks {

  private readonly logger = new Logger(ScheduledCampaignTasks.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.CAMPAIGNS_ENGINE) private readonly campaignsQueue: Queue
  ) { }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledCampaign() {
    this.logger.log('Processando campanhas agendadas');

    const now = nowUTC();

    const start = new Date(now.getTime() - 5 * 60 * 1000);
    const end = new Date(now.getTime() + 5 * 60 * 1000);

    this.logger.log(`Buscando campanhas agendadas entre ${start.toISOString()} e ${end.toISOString()}`);

    try {
      const campaigns = await this.prisma.campaign.findMany({
        where: {
          scheduledDate: {
            gte: start,
            lte: end
          },
          status: CampaignStatus.WAITING
        }
      });

      this.logger.log(`Foram encontradas ${campaigns.length} campanhas agendadas`);

      if (campaigns.length > 0) {

        for (const campaign of campaigns) {
          await this.campaignsQueue.add(QUEUE_NAMES.CAMPAIGNS_ENGINE, { campaignId: campaign.id });
          this.logger.log(`Campanha ${campaign.name} (ID: ${campaign.id}) com data agendada ${campaign.scheduledDate.toISOString()} enviada para processamento`);
        }

        this.logger.log('Todas as campanhas foram enviadas para processamento');
      }
    } catch (error) {
      this.logger.error('Erro ao processar campanhas agendadas:', error);
    }
  }
}