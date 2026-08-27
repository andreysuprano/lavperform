import { Injectable, NotFoundException, Inject, Logger, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AutomaticCampaignType, CampaignChannel, MessageStatus, MetaTemplateStatus } from '@prisma/client';
import { CreateAutomaticCampaignDto } from './dto/create-automatic-campaign.dto';
import { UpdateAutomaticCampaignDto } from './dto/update-automatic-campaign.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AutomaticCampaignFilterDto } from './dto/automatic-campaign-filter.dto';
import { IAutomaticCampaignRepository } from '../domain/automatic-campaign.repository.interface';
import {
  DateRangeFilterDto,
  resolveDateRange,
} from '../../common/dto/date-range-filter.dto';
import {
  CampaignMessagesFilterDto,
  resolveCampaignMessagesFilter,
} from './dto/campaign-messages-filter.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import {
  nowUTC,
  startOfDayInTz,
  endOfDayInTz,
  getOpeningHoursTimezone,
  parseCampaignStartDate,
  parseCampaignEndDate,
} from '../../common/utils/date.utils';
import {
  MetaMessageTemplateRow,
  MetaTemplatesService,
} from '../../integrations/meta/application/meta-templates.service';
import { MetaTemplateResponseDto } from '../../integrations/meta/dto/meta-template-response.dto';
import { normalizeSendScheduleFields } from './campaign-send-schedule.utils';
import {
  countTemplateBodyVariables,
  MetaTemplateVariableMapping,
  normalizeMetaTemplateVariableMappings,
} from '../../integrations/meta/application/meta-template-variables.utils';
import { normalizeCampaignTargeting } from '../../audiences/application/campaign-targeting.utils';
import { AudienceTargetingMode } from '@prisma/client';
import { CustomSendListsService } from '../../custom-send-lists/application/custom-send-lists.service';
import { CAMPAIGN_PAUSED_ABORT_ERROR } from '../automatic-campaign.constants';

@Injectable()
export class AutomaticCampaignService {
  private readonly logger = new Logger(AutomaticCampaignService.name);

  constructor(
    @Inject('IAutomaticCampaignRepository')
    private readonly automaticCampaignRepository: IAutomaticCampaignRepository,
    private readonly prisma: PrismaService,
    private readonly metaTemplatesService: MetaTemplatesService,
    private readonly customSendListsService: CustomSendListsService,
    @InjectQueue(QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE)
    private readonly automaticCampaignsQueue: Queue,
  ) { }

  async create(
    companyId: string,
    createAutomaticCampaignDto: CreateAutomaticCampaignDto,
    internalOptions: { showSalesOnCard?: boolean } = {},
  ) {
    const {
      gifts,
      creatives,
      couponId,
      metaMessageTemplateId,
      metaTemplateVariableMappings,
      ...campaignData
    } = createAutomaticCampaignDto;

    if (couponId) {
      await this.assertCouponIsValid(couponId, companyId);
    }

    const channel = campaignData.channel ?? CampaignChannel.WHATSAPP_WEB;
    await this.validateMetaTemplateCampaign(companyId, channel, {
      metaMessageTemplateId,
      metaTemplateVariableMappings,
      creatives,
    });

    const usesSelectedTemplate =
      channel === CampaignChannel.WHATSAPP_BUSINESS_API && !!metaMessageTemplateId;

    const targeting = normalizeCampaignTargeting(createAutomaticCampaignDto);
    if (targeting.targetingMode === AudienceTargetingMode.AUDIENCE) {
      await this.assertAudienceBelongsToCompany(companyId, targeting.audienceId!);
    }
    if (targeting.targetingMode === AudienceTargetingMode.CUSTOMER_LIST) {
      await this.customSendListsService.assertCustomSendListBelongsToCompany(
        companyId,
        targeting.customSendListId!,
      );
    }

    const createdCampaign = await this.automaticCampaignRepository.createWithRelations(
      {
        ...campaignData,
        ...targeting,
        channel,
        maxDailySends: createAutomaticCampaignDto.maxDailySends ?? 50,
        ...internalOptions,
        companyId,
        couponId: couponId ?? null,
        metaMessageTemplateId: metaMessageTemplateId ?? null,
        metaTemplateVariableMappings: metaTemplateVariableMappings ?? null,
        startDate: parseCampaignStartDate(createAutomaticCampaignDto.startDate),
        endDate: createAutomaticCampaignDto.endDate
          ? parseCampaignEndDate(createAutomaticCampaignDto.endDate)
          : null,
        ...normalizeSendScheduleFields(
          createAutomaticCampaignDto.sendTimeStart,
          createAutomaticCampaignDto.sendTimeEnd,
        ),
      },
      gifts,
      usesSelectedTemplate ? undefined : creatives,
    );

    let metaTemplates: MetaTemplateResponseDto[] = [];
    if (
      createdCampaign.channel === CampaignChannel.WHATSAPP_BUSINESS_API &&
      !usesSelectedTemplate
    ) {
      metaTemplates = await this.createMetaTemplatesForCampaign(companyId, createdCampaign);
    }

    return { ...createdCampaign, metaTemplates };
  }

  private async validateMetaTemplateCampaign(
    companyId: string,
    channel: CampaignChannel,
    dto: {
      metaMessageTemplateId?: string | null;
      metaTemplateVariableMappings?: MetaTemplateVariableMapping[];
      creatives?: Array<unknown>;
    },
  ): Promise<void> {
    if (channel !== CampaignChannel.WHATSAPP_BUSINESS_API) {
      return;
    }

    if (dto.metaMessageTemplateId) {
      const template = await this.prisma.metaMessageTemplate.findFirst({
        where: {
          id: dto.metaMessageTemplateId,
          companyId,
        },
      });

      if (!template) {
        throw new BadRequestException('Template Meta não encontrado para esta empresa');
      }

      if (template.status !== MetaTemplateStatus.APPROVED) {
        throw new BadRequestException(
          'O template selecionado precisa estar aprovado pela Meta',
        );
      }

      const variableCount = countTemplateBodyVariables(template.components);
      const mappings = normalizeMetaTemplateVariableMappings(
        dto.metaTemplateVariableMappings,
      );

      for (let index = 1; index <= variableCount; index += 1) {
        if (!mappings.some((mapping) => mapping.index === index)) {
          throw new BadRequestException(
            `Informe a origem dos dados para a variável {{${index}}} do template`,
          );
        }
      }

      return;
    }

    if (!dto.creatives?.length) {
      throw new BadRequestException(
        'Selecione um template Meta aprovado ou adicione ao menos um criativo',
      );
    }
  }

  private async createMetaTemplatesForCampaign(
    companyId: string,
    campaign: { id: string; name: string; creatives?: Array<any> },
  ): Promise<MetaTemplateResponseDto[]> {
    if (!campaign.creatives?.length) {
      this.logger.warn(
        `Campanha ${campaign.id}: nenhum criativo encontrado para criar template Meta`,
      );
      return [];
    }

    const results: MetaTemplateResponseDto[] = [];

    for (const [index, creative] of campaign.creatives.entries()) {
      const template = await this.metaTemplatesService.createFromCreative(
        companyId,
        creative,
        campaign.name,
        index,
      );
      results.push(template);

      if (template.status === MetaTemplateStatus.ERROR) {
        this.logger.warn(
          `Campanha ${campaign.id}: template do criativo ${creative.id} criado com ERROR   ${template.rejectedReason}`,
        );
      }
    }

    return results;
  }

  async duplicate(companyId: string, campaignId: string) {
    const source = await this.automaticCampaignRepository.findById(campaignId);

    if (!source || source.companyId !== companyId) {
      throw new NotFoundException('Campanha automática não encontrada');
    }

    const cloneName = `Cópia ${source.name}`;

    const gifts = source.gifts?.map((g: { type: string; unit: string; value: unknown }) => {
      const v = g.value as { toNumber?: () => number };
      const value =
        v != null && typeof v.toNumber === 'function' ? v.toNumber() : Number(g.value);
      return { type: g.type, unit: g.unit, value };
    });

    const creatives = source.creatives?.map((c) => ({
      imageUrls: c.imageUrls ? [...c.imageUrls] : [],
      title: c.title,
      message: c.message,
      link: c.link ?? undefined,
    }));

    const duplicateDto: CreateAutomaticCampaignDto = {
      name: cloneName,
      type: source.type as AutomaticCampaignType,
      channel: source.channel,
      targetingMode: source.targetingMode,
      segmentation: source.segmentation,
      audienceId: source.audienceId ?? undefined,
      customSendListId: source.customSendListId ?? undefined,
      maxDailySends: source.maxDailySends,
      active: source.active,
      ...(source.images?.trim()
        ? { images: source.images }
        : {}),
      startDate: source.startDate.toISOString(),
      endDate: source.endDate ? source.endDate.toISOString() : null,
      messageText: source.messageText,
      daysOfWeek:
        source.daysOfWeek?.length ? [...source.daysOfWeek] : undefined,
      sendTimeStart: source.sendTimeStart ?? null,
      sendTimeEnd: source.sendTimeEnd ?? null,
      ...(gifts?.length ? { gifts } : {}),
      ...(creatives?.length ? { creatives } : {}),
      couponId: source.couponId ?? null,
      metaMessageTemplateId: source.metaMessageTemplateId ?? null,
      metaTemplateVariableMappings: normalizeMetaTemplateVariableMappings(
        source.metaTemplateVariableMappings,
      ),
    };

    return this.create(companyId, duplicateDto, {
      showSalesOnCard: source.showSalesOnCard ?? true,
    });
  }

  private async assertCouponIsValid(couponId: string, companyId: string): Promise<void> {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        id: couponId,
        companyId,
        deletedAt: null,
      },
    });

    if (!coupon) {
      throw new BadRequestException('Cupom não encontrado para esta empresa');
    }

    if (!coupon.active) {
      throw new BadRequestException('Cupom informado está inativo');
    }

    const now = nowUTC();
    if (coupon.validUntil < now) {
      throw new BadRequestException('Cupom informado está expirado');
    }
  }

  async findAll(companyId: string, paginationDto: PaginationDto, filterDto: AutomaticCampaignFilterDto) {
    const { page, limit } = paginationDto;
    const { items, total } = await this.automaticCampaignRepository.findAllWithFilters(companyId, paginationDto, filterDto);

    return {
      data: items,
      meta: {
        total,
        page: page || 1,
        limit: limit || 10,
        totalPages: Math.ceil(total / (limit || 10)),
      },
    };
  }

  async findOne(id: string) {
    const campaign = await this.automaticCampaignRepository.findById(id);
    if (!campaign) {
      throw new NotFoundException('Campanha automática não encontrada');
    }
    return campaign;
  }

  async update(id: string, updateAutomaticCampaignDto: UpdateAutomaticCampaignDto) {
    const existing = await this.findOne(id);
    const {
      gifts,
      creatives,
      couponId,
      metaMessageTemplateId,
      metaTemplateVariableMappings,
      ...campaignData
    } = updateAutomaticCampaignDto;

    const nextChannel = updateAutomaticCampaignDto.channel ?? existing.channel;
    const nextTemplateId =
      'metaMessageTemplateId' in updateAutomaticCampaignDto
        ? metaMessageTemplateId ?? null
        : existing.metaMessageTemplateId ?? null;
    const nextMappings =
      'metaTemplateVariableMappings' in updateAutomaticCampaignDto
        ? metaTemplateVariableMappings
        : normalizeMetaTemplateVariableMappings(existing.metaTemplateVariableMappings);

    await this.validateMetaTemplateCampaign(existing.companyId, nextChannel, {
      metaMessageTemplateId: nextTemplateId,
      metaTemplateVariableMappings: nextMappings,
      creatives: creatives ?? existing.creatives,
    });

    const couponProvided = 'couponId' in updateAutomaticCampaignDto;
    const couponChanged =
      couponProvided && (couponId ?? null) !== (existing.couponId ?? null);

    if (couponChanged && couponId) {
      await this.assertCouponIsValid(couponId, existing.companyId);
    }

    const updateData: any = { ...campaignData };
    if (updateAutomaticCampaignDto.startDate) {
      updateData.startDate = parseCampaignStartDate(updateAutomaticCampaignDto.startDate);
    }
    if ('endDate' in updateAutomaticCampaignDto) {
      updateData.endDate = updateAutomaticCampaignDto.endDate
        ? parseCampaignEndDate(updateAutomaticCampaignDto.endDate)
        : null;
    }
    if (couponProvided) {
      updateData.couponId = couponId ?? null;
    }

    if ('sendTimeStart' in updateAutomaticCampaignDto || 'sendTimeEnd' in updateAutomaticCampaignDto) {
      const normalized = normalizeSendScheduleFields(
        updateAutomaticCampaignDto.sendTimeStart,
        updateAutomaticCampaignDto.sendTimeEnd,
      );
      updateData.sendTimeStart = normalized.sendTimeStart;
      updateData.sendTimeEnd = normalized.sendTimeEnd;
    }

    if ('metaMessageTemplateId' in updateAutomaticCampaignDto) {
      updateData.metaMessageTemplateId = metaMessageTemplateId ?? null;
    }

    if ('metaTemplateVariableMappings' in updateAutomaticCampaignDto) {
      updateData.metaTemplateVariableMappings = metaTemplateVariableMappings ?? null;
    }

    if (
      updateAutomaticCampaignDto.targetingMode !== undefined ||
      updateAutomaticCampaignDto.segmentation !== undefined ||
      updateAutomaticCampaignDto.audienceId !== undefined ||
      updateAutomaticCampaignDto.customSendListId !== undefined
    ) {
      const targeting = normalizeCampaignTargeting({
        targetingMode: updateAutomaticCampaignDto.targetingMode ?? existing.targetingMode,
        segmentation: updateAutomaticCampaignDto.segmentation ?? existing.segmentation,
        audienceId:
          updateAutomaticCampaignDto.audienceId === null
            ? undefined
            : (updateAutomaticCampaignDto.audienceId ?? existing.audienceId),
        customSendListId:
          updateAutomaticCampaignDto.customSendListId === null
            ? undefined
            : (updateAutomaticCampaignDto.customSendListId ?? existing.customSendListId),
      });

      if (targeting.targetingMode === AudienceTargetingMode.AUDIENCE) {
        await this.assertAudienceBelongsToCompany(existing.companyId, targeting.audienceId!);
      }

      if (targeting.targetingMode === AudienceTargetingMode.CUSTOMER_LIST) {
        await this.customSendListsService.assertCustomSendListBelongsToCompany(
          existing.companyId,
          targeting.customSendListId!,
        );
      }

      Object.assign(updateData, targeting);
    }

    const usesSelectedTemplate =
      nextChannel === CampaignChannel.WHATSAPP_BUSINESS_API && !!nextTemplateId;

    const dataToUpdate = {
      ...updateData,
      gifts: gifts ? { create: gifts } : undefined,
      creatives: usesSelectedTemplate
        ? creatives
          ? { create: [] }
          : undefined
        : creatives
          ? { create: creatives }
          : undefined,
    };

    const shouldReconcileTemplates =
      Boolean(creatives) &&
      existing.channel === CampaignChannel.WHATSAPP_BUSINESS_API &&
      !usesSelectedTemplate;
    let previousTemplatesOrdered: Array<MetaMessageTemplateRow | null> = [];
    if (shouldReconcileTemplates) {
      const previousCreativeIdsOrdered = [...(existing.creatives ?? [])]
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((c) => c.id);
      previousTemplatesOrdered =
        await this.metaTemplatesService.findTemplatesByCreativeIdsOrdered(
          existing.companyId,
          previousCreativeIdsOrdered,
        );
    }

    const updated = await this.automaticCampaignRepository.update(id, dataToUpdate);

    // Reconcilia templates Meta com os novos criativos: edita os templates
    // existentes (POST /{TEMPLATE_ID}) na mesma posição, cria templates para
    // criativos a mais e arquiva templates de criativos removidos.
    if (shouldReconcileTemplates && updated.channel === CampaignChannel.WHATSAPP_BUSINESS_API) {
      const newCreativesOrdered = [...(updated.creatives ?? [])].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );

      try {
        const metaTemplates =
          await this.metaTemplatesService.reconcileTemplatesForCampaign(
            existing.companyId,
            updated.name,
            newCreativesOrdered,
            previousTemplatesOrdered,
          );
        const hasErrors = metaTemplates.some(
          (t) => t.status === MetaTemplateStatus.ERROR,
        );
        if (hasErrors) {
          this.logger.warn(
            `Campanha ${id}: um ou mais templates Meta tiveram erro ao reconciliar após atualização`,
          );
        }
      } catch (err) {
        this.logger.error(
          `Campanha ${id}: falha ao reconciliar templates Meta após edição`,
          err instanceof Error ? err.stack : err,
        );
      }
    }

    // Disparado em background para não bloquear a resposta HTTP. Eventuais
    // falhas no delete das mensagens PENDING ou no enfileiramento são
    // logadas e isoladas   uma não impede a outra.
    void this.cancelPendingMessagesAndReprocess(id);

    return updated;
  }

  private async cancelPendingMessagesAndReprocess(campaignId: string): Promise<void> {
    const now = nowUTC();
    const startOfToday = startOfDayInTz(now);
    const endOfToday = endOfDayInTz(now);

    try {
      const t0 = Date.now();
      const { count: deletedCount } = await this.prisma.message.deleteMany({
        where: {
          automaticCampaignId: campaignId,
          status: MessageStatus.PENDING,
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      });
      this.logger.log(
        `Campanha ${campaignId}: ${deletedCount} mensagens PENDING do dia excluídas após edição (em ${Date.now() - t0}ms)`,
      );
    } catch (err) {
      this.logger.error(
        `Campanha ${campaignId}: falha ao excluir mensagens PENDING após edição`,
        err instanceof Error ? err.stack : err,
      );
    }

    const todayStr = startOfToday.toISOString().slice(0, 10);
    const jobId = `automatic-campaign:${campaignId}:${todayStr}`;

    try {
      const t0 = Date.now();
      await this.automaticCampaignsQueue.add(
        QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE,
        { automaticCampaignId: campaignId },
        { jobId },
      );
      this.logger.log(
        `Campanha ${campaignId}: re-enfileirada para regenerar mensagens (job ${jobId}, em ${Date.now() - t0}ms)`,
      );
    } catch (err) {
      this.logger.error(
        `Campanha ${campaignId}: falha ao enfileirar regeneração de mensagens (job ${jobId})`,
        err instanceof Error ? err.stack : err,
      );
    }
  }

  async reprocess(id: string) {
    this.logger.log(`Reprocessando campanha automática ID recebido: [${id}] (length=${id?.length})`);

    const rawResult = await this.prisma.$queryRawUnsafe<{ id: string; name: string }[]>(
      `SELECT id, name FROM "AutomaticCampaign" WHERE id = $1 LIMIT 1`,
      id,
    );
    this.logger.log(`Raw SQL result: ${JSON.stringify(rawResult)}`);

    const campaign = await this.prisma.automaticCampaign.findFirst({
      where: { id }
    });

    this.logger.log(`Prisma findFirst result: ${JSON.stringify(campaign)}`);

    if (!campaign) {
      throw new NotFoundException(`Campanha automática não encontrada (id=${id})`);
    }

    if (campaign.deletedAt) {
      throw new NotFoundException(`Campanha automática foi deletada e não pode ser reprocessada (id=${id})`);
    }

    await this.cancelPendingMessagesAndReprocess(id);
    return { message: 'Campanha automática enviada para reprocessamento com sucesso', campaignId: campaign.id };
  }

  private async abortUnsentMessagesForPause(campaignId: string): Promise<number> {
    const { count } = await this.prisma.message.updateMany({
      where: {
        automaticCampaignId: campaignId,
        status: { in: [MessageStatus.PENDING, MessageStatus.PROCESSING] },
      },
      data: {
        status: MessageStatus.ABORTED,
        error: CAMPAIGN_PAUSED_ABORT_ERROR,
      },
    });
    return count;
  }

  async toggleActive(id: string, companyId: string) {
    const campaign = await this.findOne(id);

    if (campaign.active) {
      await this.prisma.$transaction(async (tx) => {
        await tx.automaticCampaign.update({
          where: { id, companyId },
          data: { active: false },
        });
        await tx.message.updateMany({
          where: {
            automaticCampaignId: id,
            status: { in: [MessageStatus.PENDING, MessageStatus.PROCESSING] },
          },
          data: {
            status: MessageStatus.ABORTED,
            error: CAMPAIGN_PAUSED_ABORT_ERROR,
          },
        });
      });
      return this.findOne(id);
    }

    await this.prisma.automaticCampaign.update({
      where: { id, companyId },
      data: { active: true, lastProcessedAt: null },
    });

    const todayStr = startOfDayInTz(nowUTC()).toISOString().slice(0, 10);
    const jobId = `automatic-campaign:${id}:${todayStr}`;
    try {
      await this.automaticCampaignsQueue.add(
        QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE,
        { automaticCampaignId: id },
        { jobId, removeOnComplete: true, removeOnFail: true },
      );
    } catch (err) {
      this.logger.error(
        `Campanha ${id}: falha ao enfileirar job ${jobId}: ${err}`,
      );
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.abortUnsentMessagesForPause(id);
    return this.automaticCampaignRepository.softDelete(id);
  }

  async restore(id: string) {
    return this.automaticCampaignRepository.restore(id);
  }

  async getCampaignMetrics(campaignId: string, filter: DateRangeFilterDto) {
    const hasExplicitFilter = Boolean(
      filter?.startDate || filter?.endDate || filter?.dateFilter,
    );
    const timeZone = getOpeningHoursTimezone();
    const range = hasExplicitFilter
      ? resolveDateRange(filter)
      : await this.resolveAllTimeCampaignRange(campaignId, timeZone);

    return this.automaticCampaignRepository.getCampaignMetrics(campaignId, range);
  }

  private async resolveAllTimeCampaignRange(campaignId: string, timeZone: string) {
    const messageBounds = await this.prisma.message.aggregate({
      where: { automaticCampaignId: campaignId },
      _min: { createdAt: true },
      _max: { createdAt: true },
    });
    const firstMessageDate = messageBounds._min.createdAt ?? nowUTC();
    const lastMessageDate = messageBounds._max.createdAt ?? firstMessageDate;

    return {
      startDate: startOfDayInTz(firstMessageDate, timeZone),
      endDate: endOfDayInTz(lastMessageDate, timeZone),
      timeZone,
    };
  }

  /**
   * Raio-x das mensagens da campanha automática. Útil quando "as mensagens
   * foram geradas mas não foram enviadas" — sem erro registrado. Mostra:
   *  - quantas mensagens estão em cada status (PENDING/PROCESSING/SENT/ERROR/ABORTED)
   *  - quantas PENDING têm `scheduledDate` no passado (atrasadas, antes do fix do cron)
   *  - quantas PROCESSING estão travadas há mais de 10 minutos
   *  - estado do template Meta associado (se for canal WHATSAPP_BUSINESS_API)
   *  - estado da integração Meta (phoneNumberRegistered, accessToken)
   *  - amostras das últimas mensagens em cada status problemático
   */
  async getMessagesDiagnostic(id: string) {
    const campaign = await this.findOne(id);
    const now = nowUTC();
    const stuckCutoff = new Date(now.getTime() - 10 * 60 * 1000);

    const startOfToday = startOfDayInTz(now);
    const endOfToday = endOfDayInTz(now);

    const baseWhere = { automaticCampaignId: id };

    const [
      countsByStatus,
      lateCount,
      futureCount,
      stuckProcessingCount,
      lastSent,
      lastError,
      sampleLatePending,
      sampleStuckProcessing,
      sampleErrors,
    ] = await Promise.all([
      this.prisma.message.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { _all: true },
      }),
      this.prisma.message.count({
        where: {
          ...baseWhere,
          status: MessageStatus.PENDING,
          scheduledDate: { lte: now },
        },
      }),
      this.prisma.message.count({
        where: {
          ...baseWhere,
          status: MessageStatus.PENDING,
          scheduledDate: { gt: now },
        },
      }),
      this.prisma.message.count({
        where: {
          ...baseWhere,
          status: MessageStatus.PROCESSING,
          updatedAt: { lte: stuckCutoff },
        },
      }),
      this.prisma.message.findFirst({
        where: { ...baseWhere, status: MessageStatus.SENT },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, phone: true, updatedAt: true, scheduledDate: true },
      }),
      this.prisma.message.findFirst({
        where: { ...baseWhere, status: MessageStatus.ERROR },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          phone: true,
          error: true,
          updatedAt: true,
          scheduledDate: true,
        },
      }),
      this.prisma.message.findMany({
        where: {
          ...baseWhere,
          status: MessageStatus.PENDING,
          scheduledDate: { lte: now },
        },
        orderBy: { scheduledDate: 'asc' },
        take: 5,
        select: {
          id: true,
          phone: true,
          scheduledDate: true,
          createdAt: true,
          metaMessageTemplateId: true,
        },
      }),
      this.prisma.message.findMany({
        where: {
          ...baseWhere,
          status: MessageStatus.PROCESSING,
          updatedAt: { lte: stuckCutoff },
        },
        orderBy: { updatedAt: 'asc' },
        take: 5,
        select: {
          id: true,
          phone: true,
          scheduledDate: true,
          updatedAt: true,
          metaMessageTemplateId: true,
        },
      }),
      this.prisma.message.findMany({
        where: { ...baseWhere, status: MessageStatus.ERROR },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          phone: true,
          error: true,
          updatedAt: true,
        },
      }),
    ]);

    const todayTotal = await this.prisma.message.count({
      where: {
        ...baseWhere,
        createdAt: { gte: startOfToday, lte: endOfToday },
      },
    });
    const todaySent = await this.prisma.message.count({
      where: {
        ...baseWhere,
        status: MessageStatus.SENT,
        createdAt: { gte: startOfToday, lte: endOfToday },
      },
    });

    const statusCounts: Record<string, number> = {};
    for (const row of countsByStatus) {
      statusCounts[row.status] = row._count._all;
    }

    let metaIntegrationState: Record<string, unknown> | null = null;
    let templateStates: Array<Record<string, unknown>> | null = null;

    if (campaign.channel === CampaignChannel.WHATSAPP_BUSINESS_API) {
      const integration = await this.prisma.metaIntegration.findUnique({
        where: { companyId: campaign.companyId },
        select: {
          status: true,
          phoneNumberId: true,
          wabaId: true,
          phoneNumberRegistered: true,
          accessToken: true,
        },
      });

      metaIntegrationState = integration
        ? {
            status: integration.status,
            hasPhoneNumberId: Boolean(integration.phoneNumberId),
            hasWabaId: Boolean(integration.wabaId),
            hasAccessToken: Boolean(integration.accessToken),
            phoneNumberRegistered: integration.phoneNumberRegistered,
          }
        : null;

      const creativeIds = (campaign.creatives ?? []).map(
        (c: { id: string }) => c.id,
      );
      const templateOrFilters = [
        ...(creativeIds.length > 0
          ? [{ automaticCampaignCreativeId: { in: creativeIds } }]
          : []),
        ...(campaign.metaMessageTemplateId
          ? [{ id: campaign.metaMessageTemplateId }]
          : []),
      ];

      templateStates =
        templateOrFilters.length === 0
          ? []
          : await this.prisma.metaMessageTemplate.findMany({
              where: {
                companyId: campaign.companyId,
                OR: templateOrFilters,
              },
              select: {
                id: true,
                name: true,
                status: true,
                rejectedReason: true,
                metaTemplateId: true,
                automaticCampaignCreativeId: true,
              },
            });
    }

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        active: campaign.active,
        channel: campaign.channel,
        companyId: campaign.companyId,
      },
      now: now.toISOString(),
      statusCounts,
      pending: {
        total: statusCounts[MessageStatus.PENDING] ?? 0,
        late: lateCount,
        future: futureCount,
      },
      processing: {
        total: statusCounts[MessageStatus.PROCESSING] ?? 0,
        stuck: stuckProcessingCount,
      },
      today: {
        totalCreated: todayTotal,
        sent: todaySent,
      },
      lastSent,
      lastError,
      samples: {
        latePending: sampleLatePending,
        stuckProcessing: sampleStuckProcessing,
        errors: sampleErrors,
      },
      metaIntegrationState,
      templateStates,
    };
  }

  /**
   * Reescalona mensagens "presas" para serem enviadas imediatamente:
   *  - PENDING com `scheduledDate <= now` → mantém PENDING mas com
   *    `scheduledDate = now + 1min` (entrando na janela do cron).
   *  - PROCESSING há > 10min (worker morreu antes de processar) →
   *    volta para PENDING com `scheduledDate = now + 1min`.
   *
   * Distribui os `scheduledDate` em janelas de até 60 mensagens por
   * minuto a partir de `now + 1min` para não estourar rate-limit do
   * provedor (Meta/Evolution).
   */
  async rescheduleStuckMessages(id: string): Promise<{
    rescheduledPending: number;
    recoveredProcessing: number;
    total: number;
  }> {
    await this.findOne(id);
    const now = nowUTC();
    const stuckCutoff = new Date(now.getTime() - 10 * 60 * 1000);

    const stuck = await this.prisma.message.findMany({
      where: {
        automaticCampaignId: id,
        OR: [
          {
            status: MessageStatus.PENDING,
            scheduledDate: { lte: now },
          },
          {
            status: MessageStatus.PROCESSING,
            updatedAt: { lte: stuckCutoff },
          },
        ],
      },
      select: { id: true, status: true },
    });

    if (stuck.length === 0) {
      return { rescheduledPending: 0, recoveredProcessing: 0, total: 0 };
    }

    let rescheduledPending = 0;
    let recoveredProcessing = 0;
    const baseTime = new Date(now.getTime() + 60_000);
    const MESSAGES_PER_MINUTE = 60;

    await this.prisma.$transaction(
      stuck.map((message, index) => {
        const minuteOffset = Math.floor(index / MESSAGES_PER_MINUTE);
        const secondOffset = index % MESSAGES_PER_MINUTE;
        const newScheduledDate = new Date(
          baseTime.getTime() + minuteOffset * 60_000 + secondOffset * 1_000,
        );

        if (message.status === MessageStatus.PROCESSING) {
          recoveredProcessing += 1;
        } else {
          rescheduledPending += 1;
        }

        return this.prisma.message.update({
          where: { id: message.id },
          data: {
            status: MessageStatus.PENDING,
            scheduledDate: newScheduledDate,
          },
        });
      }),
    );

    this.logger.log(
      `Campanha ${id}: ${stuck.length} mensagens reescalonadas (PENDING atrasadas=${rescheduledPending}, PROCESSING travadas=${recoveredProcessing})`,
    );

    return {
      rescheduledPending,
      recoveredProcessing,
      total: stuck.length,
    };
  }

  async getCampaignMessages(campaignId: string, filterDto: CampaignMessagesFilterDto) {
    const filter = resolveCampaignMessagesFilter(filterDto);
    const messages = await this.automaticCampaignRepository.getCampaignMessages(
      campaignId,
      filter,
    );

    // Retorna as mensagens ordenadas de forma crescente pelo horário de scheduledDate
    return messages.data
      .map((message) => ({
        ...message,
        scheduledDate: message.scheduledDate ? new Date(message.scheduledDate) : null,
      }))
      .sort((a, b) => {
        if (!a.scheduledDate && !b.scheduledDate) return 0;
        if (!a.scheduledDate) return 1;
        if (!b.scheduledDate) return -1;
        return a.scheduledDate.getTime() - b.scheduledDate.getTime();
      });
  }

  private async assertAudienceBelongsToCompany(companyId: string, audienceId: string) {
    const audience = await this.prisma.audience.findFirst({
      where: { id: audienceId, companyId, deletedAt: null },
    });

    if (!audience) {
      throw new BadRequestException('Audiência não encontrada para esta empresa');
    }
  }
}
