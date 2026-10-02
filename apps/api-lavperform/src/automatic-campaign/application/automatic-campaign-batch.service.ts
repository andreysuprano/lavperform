import { Injectable, Logger } from '@nestjs/common';
import {
  AutomaticCampaignSendMode,
  AutomaticCampaignStatus,
  AudienceTargetingMode,
  CampaignChannel,
  MessageStatus,
  Prisma,
} from '@prisma/client';
import { CampaignCustomerResolverService } from '../../audiences/application/campaign-customer-resolver.service';
import { PrismaService } from '../../prisma/prisma.service';
import { nowUTC } from '../../common/utils/date.utils';
import { BATCH_LEFT_ABORT_ERROR } from '../automatic-campaign.constants';

export type BatchCampaignRef = {
  id: string;
  companyId: string;
  targetingMode: AudienceTargetingMode;
  segmentation: string | null;
  audienceId: string | null;
  customSendListId: string | null;
  channel: CampaignChannel;
  status: AutomaticCampaignStatus;
};

type Tx = Prisma.TransactionClient;

@Injectable()
export class AutomaticCampaignBatchService {
  private readonly logger = new Logger(AutomaticCampaignBatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: CampaignCustomerResolverService,
  ) {}

  async tryFreezeCoverBatch(campaign: BatchCampaignRef): Promise<'frozen' | 'failed'> {
    try {
      const customerIds = await this.resolveContactableIds(campaign);
      await this.commitBatch(campaign, customerIds);
      return 'frozen';
    } catch (error) {
      this.logger.error(
        `Campanha ${campaign.id}: falha ao gravar a leva`,
        error instanceof Error ? error.stack : error,
      );
      return 'failed';
    }
  }

  async syncAfterSave(
    campaign: BatchCampaignRef & { sendMode: AutomaticCampaignSendMode },
  ): Promise<void> {
    if (campaign.sendMode === AutomaticCampaignSendMode.CONTINUOUS) {
      await this.clearContinuous(campaign.id, campaign.status);
      return;
    }
    await this.tryFreezeCoverBatch(campaign);
  }

  async resolveContactableIds(campaign: BatchCampaignRef): Promise<string[]> {
    const customers = await this.resolver.resolveCustomers({
      companyId: campaign.companyId,
      targetingMode: campaign.targetingMode,
      segmentation: campaign.segmentation ?? undefined,
      audienceId: campaign.audienceId,
      customSendListId: campaign.customSendListId,
      channel: campaign.channel,
      eligibility: 'contactable',
    });
    return customers.map((customer) => customer.id);
  }

  async commitBatch(campaign: BatchCampaignRef, customerIds: string[]): Promise<void> {
    const uniqueIds = [...new Set(customerIds)];
    await this.prisma.$transaction(async (tx) => {
      await tx.automaticCampaignBatchRecipient.deleteMany({
        where: { automaticCampaignId: campaign.id },
      });
      if (uniqueIds.length > 0) {
        await tx.automaticCampaignBatchRecipient.createMany({
          data: uniqueIds.map((customerId) => ({
            automaticCampaignId: campaign.id,
            customerId,
          })),
        });
      }
      await tx.message.updateMany({
        where: {
          automaticCampaignId: campaign.id,
          status: MessageStatus.PENDING,
          customerId: { notIn: uniqueIds.length > 0 ? uniqueIds : ['__none__'] },
        },
        data: { status: MessageStatus.ABORTED, error: BATCH_LEFT_ABORT_ERROR },
      });
      await tx.campaignMetric.updateMany({
        where: { automaticCampaignId: campaign.id },
        data: { totalCustomers: uniqueIds.length },
      });
      const covered = await this.isCovered(tx, campaign.id, uniqueIds);
      const reopen =
        campaign.status === AutomaticCampaignStatus.COMPLETED && !covered;
      await tx.automaticCampaign.update({
        where: { id: campaign.id },
        data: {
          sendMode: AutomaticCampaignSendMode.COVER_BATCH,
          batchSnapshottedAt: nowUTC(),
          ...(covered
            ? { status: AutomaticCampaignStatus.COMPLETED, active: false }
            : reopen
              ? { status: AutomaticCampaignStatus.IN_PROGRESS, active: true }
              : {}),
        },
      });
    });
  }

  async clearContinuous(
    campaignId: string,
    status: AutomaticCampaignStatus,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.automaticCampaignBatchRecipient.deleteMany({
        where: { automaticCampaignId: campaignId },
      });
      await tx.automaticCampaign.update({
        where: { id: campaignId },
        data: {
          sendMode: AutomaticCampaignSendMode.CONTINUOUS,
          batchSnapshottedAt: null,
          ...(status === AutomaticCampaignStatus.COMPLETED
            ? { status: AutomaticCampaignStatus.IN_PROGRESS, active: true }
            : {}),
        },
      });
    });
  }

  async completeIfCovered(automaticCampaignId: string): Promise<boolean> {
    const campaign = await this.prisma.automaticCampaign.findUnique({
      where: { id: automaticCampaignId },
      select: {
        sendMode: true,
        batchSnapshottedAt: true,
        status: true,
      },
    });
    if (
      !campaign ||
      campaign.sendMode !== AutomaticCampaignSendMode.COVER_BATCH ||
      !campaign.batchSnapshottedAt ||
      campaign.status === AutomaticCampaignStatus.COMPLETED
    ) {
      return campaign?.status === AutomaticCampaignStatus.COMPLETED;
    }
    const recipients = await this.prisma.automaticCampaignBatchRecipient.findMany({
      where: { automaticCampaignId },
      select: { customerId: true },
    });
    const covered = await this.isCovered(
      this.prisma,
      automaticCampaignId,
      recipients.map((row) => row.customerId),
    );
    if (!covered) return false;
    await this.prisma.automaticCampaign.update({
      where: { id: automaticCampaignId },
      data: { status: AutomaticCampaignStatus.COMPLETED, active: false },
    });
    return true;
  }

  async customerStillInBatch(
    automaticCampaignId: string,
    customerId: string,
  ): Promise<boolean> {
    const row = await this.prisma.automaticCampaignBatchRecipient.findFirst({
      where: { automaticCampaignId, customerId },
      select: { id: true },
    });
    return !!row;
  }

  private async isCovered(
    db: Tx | PrismaService,
    campaignId: string,
    customerIds: string[],
  ): Promise<boolean> {
    if (customerIds.length === 0) return true;
    const sent = await db.message.findMany({
      where: {
        automaticCampaignId: campaignId,
        status: MessageStatus.SENT,
        customerId: { in: customerIds },
      },
      select: { customerId: true },
      distinct: ['customerId'],
    });
    const sentIds = new Set(sent.map((row) => row.customerId));
    return customerIds.every((id) => sentIds.has(id));
  }
}
