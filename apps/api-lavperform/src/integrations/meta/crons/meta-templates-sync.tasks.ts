import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  AutomaticCampaignStatus,
  CampaignChannel,
  MetaIntegrationStatus,
  MetaTemplateStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { nowUTC } from '../../../common/utils/date.utils';
import { MetaTemplatesService } from '../application/meta-templates.service';

/**
 * Status que ainda podem evoluir para APPROVED e por isso valem a pena sincronizar
 * periodicamente. APPROVED/REJECTED/DELETED/DISABLED são estados terminais para
 * efeito de envio   não re-consultamos para não desperdiçar quota da Graph API.
 */
const RESYNCABLE_STATUSES: MetaTemplateStatus[] = [
  MetaTemplateStatus.PENDING,
  MetaTemplateStatus.IN_APPEAL,
];

@Injectable()
export class MetaTemplatesSyncTasks {
  private readonly logger = new Logger(MetaTemplatesSyncTasks.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metaTemplatesService: MetaTemplatesService,
    @InjectQueue(QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE)
    private readonly automaticCampaignsQueue: Queue,
  ) {}

  /**
   * Sincroniza o status dos templates Meta ainda pendentes (PENDING/IN_APPEAL)
   * com a Graph API. Para os que aprovaram nesta execução, enfileira a campanha
   * automática vinculada para rodar imediatamente   sem esperar o ciclo padrão.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleTemplateSync(): Promise<void> {
    this.logger.log('Iniciando sincronização horária de templates Meta');

    let pendingTemplates;
    try {
      pendingTemplates = await this.prisma.metaMessageTemplate.findMany({
        where: {
          status: { in: RESYNCABLE_STATUSES },
          metaTemplateId: { not: null },
          company: {
            metaIntegration: { status: MetaIntegrationStatus.ACTIVE },
          },
        },
        select: { id: true, companyId: true, name: true },
      });
    } catch (err) {
      this.logger.error(
        'Falha ao listar templates Meta pendentes para sync',
        err instanceof Error ? err.stack : err,
      );
      return;
    }

    if (pendingTemplates.length === 0) {
      this.logger.log('Nenhum template Meta pendente para sincronizar');
      return;
    }

    this.logger.log(
      `Encontrados ${pendingTemplates.length} templates Meta pendentes   sincronizando`,
    );

    const approvedTemplateIds: string[] = [];

    for (const template of pendingTemplates) {
      try {
        const result = await this.metaTemplatesService.syncStatus(
          template.companyId,
          template.id,
        );

        const becameApproved =
          result.previousStatus !== MetaTemplateStatus.APPROVED &&
          result.template.status === MetaTemplateStatus.APPROVED;

        if (becameApproved) {
          this.logger.log(
            `Template ${template.id} (${template.name}) aprovado pela Meta nesta sincronização`,
          );
          approvedTemplateIds.push(template.id);
        } else if (result.statusChanged) {
          this.logger.log(
            `Template ${template.id} (${template.name}) mudou de ${result.previousStatus} para ${result.template.status}`,
          );
        }
      } catch (err) {
        this.logger.warn(
          `Falha ao sincronizar template ${template.id} (empresa ${template.companyId}): ` +
            (err instanceof Error ? err.message : String(err)),
        );
      }
    }

    if (approvedTemplateIds.length === 0) {
      this.logger.log(
        'Nenhum template virou APPROVED nesta execução   sem campanhas a enfileirar',
      );
      return;
    }

    await this.enqueueCampaignsForApprovedTemplates(approvedTemplateIds);
  }

  /**
   * Para cada template recém-aprovado, descobre a campanha automática vinculada
   * (via criativo) e enfileira o processamento de hoje. Só enfileira campanhas
   * elegíveis: canal WHATSAPP_BUSINESS_API, status PROCESSING/IN_PROGRESS, ativa,
   * não deletada, dentro do range de datas e que ainda não rodaram hoje.
   */
  private async enqueueCampaignsForApprovedTemplates(
    approvedTemplateIds: string[],
  ): Promise<void> {
    const now = nowUTC();
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);
    const todayStr = startOfToday.toISOString().slice(0, 10);

    const templatesWithCampaign = await this.prisma.metaMessageTemplate.findMany({
      where: { id: { in: approvedTemplateIds } },
      select: {
        id: true,
        automaticCampaignCreative: {
          select: { automaticCampaignId: true },
        },
      },
    });

    const campaignIds = Array.from(
      new Set(
        templatesWithCampaign
          .map((t) => t.automaticCampaignCreative?.automaticCampaignId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (campaignIds.length === 0) {
      this.logger.log(
        'Templates aprovados sem campanha automática associada   nada a enfileirar',
      );
      return;
    }

    const eligibleCampaigns = await this.prisma.automaticCampaign.findMany({
      where: {
        id: { in: campaignIds },
        channel: CampaignChannel.WHATSAPP_BUSINESS_API,
        status: {
          in: [
            AutomaticCampaignStatus.PROCESSING,
            AutomaticCampaignStatus.IN_PROGRESS,
          ],
        },
        active: true,
        deletedAt: null,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: startOfToday } }],
      },
      select: { id: true, name: true, lastProcessedAt: true },
    });

    if (eligibleCampaigns.length === 0) {
      this.logger.log(
        `Templates aprovados, mas nenhuma campanha elegível para enfileirar (de ${campaignIds.length} candidatas)`,
      );
      return;
    }

    for (const campaign of eligibleCampaigns) {
      const alreadyProcessedToday =
        campaign.lastProcessedAt !== null &&
        campaign.lastProcessedAt >= startOfToday;

      const jobId = `automatic-campaign:${campaign.id}:${todayStr}:template-approved`;

      try {
        await this.prisma.automaticCampaign.update({
          where: { id: campaign.id },
          data: { lastProcessedAt: nowUTC() },
        });

        await this.automaticCampaignsQueue.add(
          QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE,
          { automaticCampaignId: campaign.id },
          { jobId },
        );

        this.logger.log(
          `Campanha ${campaign.name} (ID: ${campaign.id}) enfileirada após aprovação de template ` +
            `(jobId=${jobId}, jaProcessadaHoje=${alreadyProcessedToday})`,
        );
      } catch (err) {
        this.logger.error(
          `Falha ao enfileirar campanha ${campaign.id} após aprovação de template (jobId=${jobId})`,
          err instanceof Error ? err.stack : err,
        );
      }
    }
  }
}
