import { Processor, Process, InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CampaignChannel, CampaignStatus, MessageStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { generateUniqueToken } from '../../../common/utils/generateUniqueToken';
import { OpenAIService } from '../../../integrations/openai/api/openai.service';
import { HttpService } from '@nestjs/axios';
import { CampaignCustomerResolverService } from '../../../audiences/application/campaign-customer-resolver.service';

@Processor(QUEUE_NAMES.CAMPAIGNS_ENGINE)
export class CampaignsProcessor {
  private readonly logger = new Logger(CampaignsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.MESSAGE_ENGINE) private readonly messageQueue: Queue,
    private readonly openaiService: OpenAIService,
    private readonly campaignCustomerResolver: CampaignCustomerResolverService,
  ) {
    this.openaiService = new OpenAIService(new HttpService());
  }

  @Process(QUEUE_NAMES.CAMPAIGNS_ENGINE)
  async process(job: Job<{ campaignId: string }>) {
    const { campaignId } = job.data;

    try {
      this.logger.log(`Processando campanha ${campaignId}`);

      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { audience: true, customSendList: true },
      });

      if (!campaign) {
        throw new Error('Campanha não encontrada');
      }

      const channel = campaign.channel ?? CampaignChannel.WHATSAPP_WEB;
      const isSms = channel === CampaignChannel.SMS;

      const customers = await this.campaignCustomerResolver.resolveCustomers({
        companyId: campaign.companyId,
        targetingMode: campaign.targetingMode,
        segmentation: campaign.segmentation,
        audienceId: campaign.audienceId,
        customSendListId: campaign.customSendListId,
        channel,
      });

      this.logger.log(`Encontrados ${customers.length} clientes para a campanha ${campaignId} (canal: ${channel})`);

      const segmentationLabel = this.campaignCustomerResolver.resolveSegmentationLabel({
        targetingMode: campaign.targetingMode,
        segmentation: campaign.segmentation,
        audienceName: campaign.audience?.name,
        customSendListName: campaign.customSendList?.name,
      });

      await this.prisma.campaignMetric.updateMany({
        where: { campaignId: campaign.id },
        data: { totalCustomers: customers.length },
      });

      await Promise.all(
        customers.map(async (customer) => {
          if (!customer.phone) {
            return;
          }

          const token = generateUniqueToken(campaign.companyId, customer.id, randomUUID());
          const trackableLink = `${process.env.REDIRECT_URL}/c/${token}`;

          let messageText: string;

          if (isSms) {
            messageText = `${campaign.messageText} ${trackableLink}`;
          } else {
            const generatedMessage = await this.openaiService.generateMessage({
              customerName: customer.name,
              messageText: campaign.messageText,
              linkCardapio: trackableLink,
            });
            messageText = generatedMessage.message;
          }

          const message = await this.prisma.message.create({
            data: {
              customerId: customer.id,
              campaignId: campaign.id,
              segmentation: segmentationLabel,
              messageText,
              mediaUrl: isSms ? null : campaign.imageUrl,
              customerName: customer.name,
              phone: customer.phone,
              companyId: campaign.companyId,
              status: MessageStatus.PROCESSING,
              channel,
              attempts: 0,
              token,
            },
          });

          await this.messageQueue.add(QUEUE_NAMES.MESSAGE_ENGINE, {
            message,
            customer,
            campaign,
          });
          this.logger.log(`Mensagem criada para o cliente ${customer.name} via ${channel}`);
        }),
      );

      await this.prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: CampaignStatus.COMPLETED },
      });
    } catch (error) {
      this.logger.error(`Erro ao processar campanha ${campaignId}: ${error}`);
    }
  }
}
