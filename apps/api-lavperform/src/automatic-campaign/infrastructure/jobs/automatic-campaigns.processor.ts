import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { Logger } from '@nestjs/common';
import { AutomaticCampaignStatus, AudienceTargetingMode, CampaignChannel, MessageStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { getDayOfWeekPtBr, nowUTC, startOfDayInTz, endOfDayInTz } from '../../../common/utils/date.utils';
import { extractErrorMessage } from '../../../common/utils/error.utils';
import { CampaignChannelStrategyFactory } from '../strategies/campaign-channel-strategy.factory';
import { RenitencyEvaluatorService } from '../../../renitency/application/renitency-evaluator.service';
import { resolveSendTimeWindow } from '../../application/campaign-send-schedule.utils';
import { CampaignCustomerResolverService } from '../../../audiences/application/campaign-customer-resolver.service';
import { CustomersService } from '../../../customers/application/customers.service';
import { WhatsappService } from '../../../whatsapp/application/whatsapp.service';
import { isWhatsappVerificationFresh } from '../../../whatsapp/application/whatsapp-verification.policy';

const MAX_WHATSAPP_VALIDATIONS_PER_RUN = 30;

@Processor(QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE)
export class AutomaticCampaignsProcessor {
  private readonly logger = new Logger(AutomaticCampaignsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly strategyFactory: CampaignChannelStrategyFactory,
    private readonly renitencyEvaluator: RenitencyEvaluatorService,
    private readonly campaignCustomerResolver: CampaignCustomerResolverService,
    private readonly customersService: CustomersService,
    private readonly whatsappService: WhatsappService,
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
          customSendList: true,
        },
      });

      if (!campaign) throw new Error('Campanha automática não encontrada');

      if (!campaign.active) {
        this.logger.log(
          `Campanha ${automaticCampaignId} está pausada (active=false) — nenhuma mensagem será gerada`,
        );
        // Não marca lastProcessedAt: ao reativar no mesmo dia, pode processar.
        return;
      }

      const maxDailySends = (campaign as any).maxDailySends ?? 50;

      const hoje = getDayOfWeekPtBr();

      if (!campaign.daysOfWeek.includes(hoje)) {
        await this.markLastProcessedAt(automaticCampaignId);
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
        this.logger.log(
          `Campanha ${automaticCampaignId}: sem janela de envio (loja fechada ou sem horário) — retry permitido no mesmo dia`,
        );
        // Não marca lastProcessedAt para permitir novo enqueue quando houver janela.
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
          `Campanha ${automaticCampaignId}: limite diário atingido (${alreadyScheduledToday}/${maxDailySends} agendadas) — nenhuma nova mensagem será criada`,
        );
        await this.persistContactableReach(campaign);
        await this.markLastProcessedAt(automaticCampaignId);
        return;
      }

      this.logger.log(
        `Campanha ${automaticCampaignId}: ${alreadyScheduledToday} agendadas hoje (PENDING/PROCESSING/SENT), ${remainingSlots} slots disponíveis`,
      );

      const isWhatsappChannel = this.shouldRevalidateWhatsappBeforeSend(campaign.channel);

      // Clientes que já receberam mensagem desta campanha hoje ficam fora da
      // amostra: um retry no mesmo dia deve alcançar quem ainda não foi contatado.
      const messagedToday = await this.prisma.message.findMany({
        where: {
          automaticCampaignId: automaticCampaignId,
          status: { in: [MessageStatus.PENDING, MessageStatus.PROCESSING, MessageStatus.SENT] },
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
        select: { customerId: true },
        distinct: ['customerId'],
      });

      const excludeCustomerIds = messagedToday.map((message) => message.customerId);

      // Métrica de alcance da audiência: não considera slots nem exclusões do dia.
      await this.persistContactableReach(campaign);

      const requestedTake = remainingSlots * 5;

      const candidates = await this.campaignCustomerResolver.resolveCustomers({
        companyId: campaign.companyId,
        targetingMode: campaign.targetingMode,
        segmentation: campaign.segmentation,
        audienceId: campaign.audienceId,
        customSendListId: campaign.customSendListId,
        channel: campaign.channel,
        eligibility: 'contactable',
        excludeCustomerIds,
        take: requestedTake,
      });

      const readyCustomers: typeof candidates = [];
      const staleCustomers: { customer: (typeof candidates)[number]; phone: string }[] = [];

      for (const candidate of candidates) {
        const { allowed } = await this.renitencyEvaluator.canContactCustomer({
          companyId: campaign.companyId,
          customerId: candidate.id,
          channel: campaign.channel,
          automaticCampaignId: campaign.id,
        });

        if (!allowed) continue;

        if (isWhatsappChannel && !isWhatsappVerificationFresh(candidate.whatsappVerifiedAt, now)) {
          if (candidate.phone) {
            staleCustomers.push({ customer: candidate, phone: candidate.phone });
          }
          continue;
        }

        readyCustomers.push(candidate);

        // Só encerra cedo quando os frescos já preenchem os slots — do contrário
        // precisamos conhecer todos os stale disponíveis para revalidar.
        if (readyCustomers.length >= remainingSlots) break;
      }

      const customers = readyCustomers.slice(0, remainingSlots);

      let validationChecks = 0;
      let validationFailures = 0;

      if (isWhatsappChannel) {
        // Sequencial de propósito: uma validação por vez para não saturar as
        // instâncias do pool de checagem.
        for (const { customer, phone } of staleCustomers) {
          if (customers.length >= remainingSlots) break;
          if (validationChecks >= MAX_WHATSAPP_VALIDATIONS_PER_RUN) break;

          validationChecks++;

          try {
            const isReachable = await this.whatsappService.validateAndPersistCustomerWhatsapp(
              customer.id,
              phone,
            );

            if (isReachable) {
              customers.push(customer);
            }
          } catch (error) {
            // Falha transitória (ex: instância fora do ar) não invalida o cliente
            // nem derruba a campanha: deixamos para a próxima execução.
            validationFailures++;
            this.logger.warn(
              `Campanha ${campaign.id}: falha ao revalidar WhatsApp do cliente ${customer.id}: ${extractErrorMessage(error)}`,
            );
          }
        }
      }

      const staleNotAttempted = staleCustomers.length - validationChecks;
      // Amostra cheia: existem contactáveis além dela, então ter esgotado os stale
      // desta amostra não significa que não há mais nada para revalidar.
      const sampleTruncated = candidates.length >= requestedTake;

      const revalidationPending =
        staleNotAttempted > 0 ||
        validationFailures > 0 ||
        (sampleTruncated && validationChecks > 0);

      // Execução conclusiva = não há mais nada a revalidar hoje para esta campanha.
      const isConclusiveRun =
        !isWhatsappChannel ||
        customers.length >= remainingSlots ||
        !revalidationPending;

      this.logger.log(
        `Encontrados ${customers.length} clientes elegíveis (de ${candidates.length} candidatos, ${validationChecks} revalidações WhatsApp) para a campanha ${campaign.id}`,
      );

      const strategy = this.strategyFactory.get(campaign.channel);
      await strategy.generateMessages({
        campaign,
        customers,
        openingHours,
        sendTimeWindow,
        alreadySentToday: alreadyScheduledToday,
        maxDailySends,
      });

      if (isWhatsappChannel) {
        // Warmup depois da validação síncrona: quem acabou de ser revalidado já
        // não entra na fila. Só enfileira, sem aguardar os jobs.
        try {
          await this.customersService.enqueueStaleWhatsappValidationForCompany(campaign.companyId);
        } catch (error) {
          this.logger.warn(
            `Campanha ${campaign.id}: falha ao enfileirar revalidação em background: ${extractErrorMessage(error)}`,
          );
        }
      }

      if (!isConclusiveRun) {
        this.logger.log(
          `Campanha ${campaign.id}: execução inconclusiva (${staleNotAttempted} stale não tentados, ${validationFailures} falhas de validação) — lastProcessedAt não será marcado para permitir retry no mesmo dia`,
        );
      }

      // As mensagens criadas agora entram no contador diário da próxima execução,
      // então o retry não duplica envios.
      await this.prisma.automaticCampaign.update({
        where: { id: campaign.id },
        data: {
          ...(isConclusiveRun ? { lastProcessedAt: nowUTC() } : {}),
          lastProcessingError: null,
          lastProcessingErrorAt: null,
          ...(campaign.status === AutomaticCampaignStatus.PROCESSING
            ? { status: AutomaticCampaignStatus.IN_PROGRESS }
            : {}),
        },
      });

      if (campaign.status === AutomaticCampaignStatus.PROCESSING) {
        this.logger.log(
          `Campanha ${campaign.id}: status atualizado de PROCESSING para IN_PROGRESS`,
        );
      }

    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      this.logger.error(
        `Erro ao processar campanha ${automaticCampaignId}: ${errorMessage}`,
      );

      const current = await this.prisma.automaticCampaign.findUnique({
        where: { id: automaticCampaignId },
        select: { status: true },
      });

      if (!current) {
        return;
      }

      const shouldMarkFailed =
        current.status === AutomaticCampaignStatus.PROCESSING;

      await this.prisma.automaticCampaign.update({
        where: { id: automaticCampaignId },
        data: {
          lastProcessingError: errorMessage,
          lastProcessingErrorAt: nowUTC(),
          ...(shouldMarkFailed
            ? { status: AutomaticCampaignStatus.FAILED }
            : {}),
        },
      });
    }
  }

  private async persistContactableReach(campaign: {
    id: string;
    companyId: string;
    targetingMode: AudienceTargetingMode;
    segmentation: string | null;
    audienceId: string | null;
    customSendListId: string | null;
    channel: CampaignChannel;
  }): Promise<number> {
    const totalCustomers = await this.campaignCustomerResolver.countEligibleCustomers({
      companyId: campaign.companyId,
      targetingMode: campaign.targetingMode,
      segmentation: campaign.segmentation ?? undefined,
      audienceId: campaign.audienceId,
      customSendListId: campaign.customSendListId,
      channel: campaign.channel,
      eligibility: 'contactable',
    });

    await this.prisma.campaignMetric.updateMany({
      where: { automaticCampaignId: campaign.id },
      data: { totalCustomers },
    });

    return totalCustomers;
  }

  private async markLastProcessedAt(automaticCampaignId: string): Promise<void> {
    await this.prisma.automaticCampaign.update({
      where: { id: automaticCampaignId },
      data: { lastProcessedAt: nowUTC() },
    });
  }

  private shouldRevalidateWhatsappBeforeSend(channel: CampaignChannel): boolean {
    return (
      channel === CampaignChannel.WHATSAPP_WEB ||
      channel === CampaignChannel.WHATSAPP_BUSINESS_API
    );
  }
}
