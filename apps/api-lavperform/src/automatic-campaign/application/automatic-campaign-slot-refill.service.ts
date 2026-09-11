import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bull';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { nowUTC, startOfDayInTz } from '../../common/utils/date.utils';
import { PrismaService } from '../../prisma/prisma.service';

export function automaticCampaignRefillJobId(campaignId: string, now: Date = nowUTC()): string {
  const todayStr = startOfDayInTz(now).toISOString().slice(0, 10);
  return `automatic-campaign:${campaignId}:${todayStr}:refill`;
}

export type RequestSlotRefillInput = {
  automaticCampaignId?: string | null;
  abortedMessageId: string;
  reason: string;
};

@Injectable()
export class AutomaticCampaignSlotRefillService {
  private readonly logger = new Logger(AutomaticCampaignSlotRefillService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE)
    private readonly automaticCampaignsQueue: Queue,
  ) {}

  async requestAfterAbort(input: RequestSlotRefillInput): Promise<void> {
    if (!input.automaticCampaignId) {
      return;
    }

    const campaign = await this.prisma.automaticCampaign.findUnique({
      where: { id: input.automaticCampaignId },
      select: { id: true, active: true, deletedAt: true },
    });

    if (!campaign?.active || campaign.deletedAt) {
      return;
    }

    const jobId = automaticCampaignRefillJobId(campaign.id);
    try {
      await this.automaticCampaignsQueue.add(
        QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE,
        { automaticCampaignId: campaign.id },
        { jobId, removeOnComplete: true, removeOnFail: true },
      );
      this.logger.log(
        `Campanha ${campaign.id}: refill enfileirado após aborto ${input.abortedMessageId} (${input.reason}) jobId=${jobId}`,
      );
    } catch (error) {
      this.logger.debug(
        `Campanha ${campaign.id}: refill ${jobId} já na fila após aborto ${input.abortedMessageId}: ${error}`,
      );
    }
  }
}
