import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { Logger } from '@nestjs/common';
import { AutomaticCampaignStatus, CampaignChannel, MessageStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { getDayOfWeekPtBr, nowUTC, startOfDayInTz, endOfDayInTz } from '../../../common/utils/date.utils';
import { CampaignChannelStrategyFactory } from '../strategies/campaign-channel-strategy.factory';
import { RenitencyEvaluatorService } from '../../../renitency/application/renitency-evaluator.service';
import { resolveSendTimeWindow } from '../../application/campaign-send-schedule.utils';
import { CampaignCustomerResolverService } from '../../../audiences/application/campaign-customer-resolver.service';


@Processor(QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE)
export class AutomaticCampaignsProcessor {
  private readonly logger = new Logger(AutomaticCampaignsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly strategyFactory: CampaignChannelStrategyFactory,
    private readonly renitencyEvaluator: RenitencyEvaluatorService,
    private readonly campaignCustomerResolver: CampaignCustomerResolverService,
  ) { }

  @Process({ name: QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE, concurrency: 20 })
  async process(job: Job<{ automaticCampaignId: string }>) {
    const { automaticCampaignId } = job.data;

    try {
      this.logger.log(`Processando campanha ${automaticCampaignId}`);

      const campaign = await this.prisma.automaticCampaign.findUnique({
        where: { id: automaticCampaignId },
        include: {
          creatives: true,
          coupon: true,
          audience: true,
        },
      });

      if (!campaign) throw new Error('Campanha automática não encontrada');
      const maxDailySends = (campaign as any).maxDailySends ?? 50;

      const hoje = getDayOfWeekPtBr();

      if (!campaign.daysOfWeek.includes(hoje)) {
        return;
      }

      const openingHours = await this.prisma.openingHours.findFirst({
        where: {
          companyId: campaign.companyId,
          dayOfWeek: hoje
        }
      });

      const sendTimeWindow = resolveSendTimeWindow(campaign, openingHours);

      if (!sendTimeWindow) {
        return;
      }

      // "Hoje" no fuso do estabelecimento — evita contar mensagens do dia
      // errado quando o servidor UTC já avançou para o dia seguinte.
      const now = nowUTC();
      const startOfToday = startOfDayInTz(now);
      const endOfToday = endOfDayInTz(now);

      // Conta todas as mensagens do dia (PENDING + PROCESSING + SENT) para evitar
      // que uma re-execução do processor (ex: edição de campanha) crie novas mensagens
      // enquanto as anteriores ainda estão em fila aguardando envio.
      const alreadyScheduledToday = await this.prisma.message.count({
        where: {
          automaticCampaignId: automaticCampaignId,
          status: { in: [MessageStatus.PENDING, MessageStatus.PROCESSING, MessageStatus.SENT] },
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      });

      const remainingSlots = maxDailySends - alreadyScheduledToday;

      if (remainingSlots <= 0) {
        this.logger.log(
          `Campanha ${automaticCampaignId}: limite diário atingido (${alreadyScheduledToday}/${maxDailySends} agendadas)   nenhuma nova mensagem será criada`,
        );
        return;
      }

      this.logger.log(
        `Campanha ${automaticCampaignId}: ${alreadyScheduledToday} agendadas hoje (PENDING/PROCESSING/SENT), ${remainingSlots} slots disponíveis`,
      );

      const isSmsChannel = campaign.channel === CampaignChannel.SMS;

      const totalCustomers = await this.campaignCustomerResolver.countEligibleCustomers({
        companyId: campaign.companyId,
        targetingMode: campaign.targetingMode,
        segmentation: campaign.segmentation,
        audienceId: campaign.audienceId,
        channel: campaign.channel,
      });

      const candidates = await this.campaignCustomerResolver.resolveCustomers({
        companyId: campaign.companyId,
        targetingMode: campaign.targetingMode,
        segmentation: campaign.segmentation,
        audienceId: campaign.audienceId,
        channel: campaign.channel,
        take: remainingSlots * 5,
      });

      const customers: typeof candidates = [];
      for (const candidate of candidates) {
        const { allowed } = await this.renitencyEvaluator.canContactCustomer({
          companyId: campaign.companyId,
          customerId: candidate.id,
          channel: campaign.channel,
          automaticCampaignId: campaign.id,
        });
        if (allowed) {
          customers.push(candidate);
          if (customers.length >= remainingSlots) break;
        }
      }

      this.logger.log(`Encontrados ${customers.length} clientes elegíveis (de ${candidates.length} candidatos) para a campanha ${campaign.id}`);

      const strategy = this.strategyFactory.get(campaign.channel);
      await strategy.generateMessages({
        campaign,
        customers,
        openingHours,
        sendTimeWindow,
        alreadySentToday: alreadyScheduledToday,
        maxDailySends,
      });

      await this.prisma.campaignMetric.updateMany({
        where: { automaticCampaignId: automaticCampaignId },
        data: {
          totalCustomers: totalCustomers,
        }
      });

      if (campaign.status === AutomaticCampaignStatus.PROCESSING) {
        await this.prisma.automaticCampaign.update({
          where: { id: campaign.id },
          data: { status: AutomaticCampaignStatus.IN_PROGRESS },
        });
        this.logger.log(
          `Campanha ${campaign.id}: status atualizado de PROCESSING para IN_PROGRESS`,
        );
      }

    } catch (error) {
      this.logger.error(`Erro ao processar campanha ${automaticCampaignId}: ${error}`);

      const current = await this.prisma.automaticCampaign.findUnique({
        where: { id: automaticCampaignId },
        select: { status: true },
      });
      if (current?.status === AutomaticCampaignStatus.PROCESSING) {
        await this.prisma.automaticCampaign.update({
          where: { id: automaticCampaignId },
          data: { status: AutomaticCampaignStatus.FAILED },
        });
      }
    }
  }
}
