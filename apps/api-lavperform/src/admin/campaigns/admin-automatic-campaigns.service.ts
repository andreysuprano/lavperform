import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AutomaticCampaignStatus, MessageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { AutomaticCampaignService } from '../../automatic-campaign/application/automatic-campaign.service';
import { AutomaticCampaignAdminFilterDto } from './dto/automatic-campaign-admin-filter.dto';
import { UpdateAutomaticCampaignAdminDto } from './dto/update-automatic-campaign-admin.dto';
import { MessagesAdminFilterDto } from './dto/messages-admin-filter.dto';
import { CreateAutomaticCampaignDto } from '../../automatic-campaign/application/dto/create-automatic-campaign.dto';
import { normalizeCampaignTargeting } from '../../audiences/application/campaign-targeting.utils';
import {
  adminMessageSelect,
  mapAdminCampaignMessage,
} from './admin-campaign-messages.helper';

@Injectable()
export class AdminAutomaticCampaignsService {
  private readonly logger = new Logger(AdminAutomaticCampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly automaticCampaignService: AutomaticCampaignService,
    @InjectQueue(QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE)
    private readonly automaticCampaignsQueue: Queue,
  ) {}

  async findAll(filterDto: AutomaticCampaignAdminFilterDto) {
    const {
      page = 1, limit = 20, orderBy = 'createdAt', orderDirection = 'desc',
      companyId, name, type, status, channel, active, startDate, endDate, deleted,
    } = filterDto;

    const where: Prisma.AutomaticCampaignWhereInput = {
      ...(companyId && { companyId }),
      ...(name && { name: { contains: name, mode: 'insensitive' } }),
      ...(type && { type }),
      ...(status && { status }),
      ...(channel && { channel }),
      ...(active !== undefined && { active }),
      ...(startDate || endDate
        ? {
            startDate: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) }),
            },
          }
        : {}),
      deletedAt: deleted ? { not: null } : null,
    };

    const allowedOrderFields = ['createdAt', 'updatedAt', 'startDate', 'endDate', 'name', 'status', 'type'];
    const safeOrderBy = allowedOrderFields.includes(orderBy) ? orderBy : 'createdAt';

    const [items, total] = await Promise.all([
      this.prisma.automaticCampaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [safeOrderBy]: orderDirection },
        include: {
          company: { select: { id: true, name: true } },
          campaignMetric: true,
          creatives: {
            select: { id: true, title: true, message: true, imageUrls: true, link: true },
          },
          gifts: true,
          coupon: { select: { id: true, code: true, description: true, active: true } },
        },
      }),
      this.prisma.automaticCampaign.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const campaign = await this.prisma.automaticCampaign.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        campaignMetric: true,
        creatives: {
          include: {
            metaTemplate: {
              select: {
                id: true,
                name: true,
                status: true,
                rejectedReason: true,
                metaTemplateId: true,
              },
            },
          },
        },
        gifts: true,
        coupon: { select: { id: true, code: true, description: true, active: true, validUntil: true } },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha automática não encontrada');
    }

    const errorSample = await this.prisma.message.findMany({
      where: { automaticCampaignId: id, status: MessageStatus.ERROR },
      select: {
        id: true,
        phone: true,
        customerName: true,
        error: true,
        attempts: true,
        channel: true,
        status: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    return { ...campaign, errorSample };
  }

  async getDiagnostic(id: string) {
    const campaign = await this.findOne(id);
    const diagnostic = await this.automaticCampaignService.getMessagesDiagnostic(id);
    return {
      ...diagnostic,
      lastProcessingError: campaign.lastProcessingError,
      lastProcessingErrorAt: campaign.lastProcessingErrorAt,
    };
  }

  async create(createDto: CreateAutomaticCampaignDto & { companyId: string }) {
    const {
      companyId,
      gifts,
      creatives,
      couponId,
      metaMessageTemplateId,
      metaTemplateVariableMappings,
      ...data
    } = createDto;

    const targeting = normalizeCampaignTargeting(createDto);

    return this.prisma.automaticCampaign.create({
      data: {
        ...data,
        ...targeting,
        companyId,
        maxDailySends: data.maxDailySends ?? 50,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        couponId: couponId ?? null,
        metaMessageTemplateId: metaMessageTemplateId ?? null,
        metaTemplateVariableMappings: metaTemplateVariableMappings
          ? (metaTemplateVariableMappings as unknown as Prisma.InputJsonValue)
          : undefined,
        ...(gifts?.length && {
          gifts: { create: gifts },
        }),
        ...(creatives?.length && {
          creatives: { create: creatives },
        }),
        campaignMetric: { create: {} },
      },
      include: {
        company: { select: { id: true, name: true } },
        campaignMetric: true,
        creatives: true,
        gifts: true,
      },
    });
  }

  async update(id: string, updateDto: UpdateAutomaticCampaignAdminDto) {
    const existing = await this.findOne(id);

    const { gifts, creatives, couponId, companyId, ...scalarData } = updateDto;

    const updateData: Prisma.AutomaticCampaignUpdateInput = { ...scalarData };

    if (updateDto.startDate) {
      updateData.startDate = new Date(updateDto.startDate);
    }
    if ('endDate' in updateDto) {
      updateData.endDate = updateDto.endDate ? new Date(updateDto.endDate) : null;
    }
    if ('couponId' in updateDto) {
      updateData.coupon = couponId ? { connect: { id: couponId } } : { disconnect: true };
    }
    if (companyId) {
      updateData.company = { connect: { id: companyId } };
    }

    if (gifts !== undefined) {
      await this.prisma.gift.deleteMany({ where: { automaticCampaignId: id } });
      if (gifts.length) {
        updateData.gifts = { create: gifts };
      }
    }

    if (creatives !== undefined) {
      await this.prisma.automaticCampaignCreative.deleteMany({ where: { automaticCampaignId: id } });
      if (creatives.length) {
        updateData.creatives = { create: creatives };
      }
    }

    const updated = await this.prisma.automaticCampaign.update({
      where: { id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
        campaignMetric: true,
        creatives: {
          include: {
            metaTemplate: { select: { id: true, name: true, status: true, rejectedReason: true } },
          },
        },
        gifts: true,
        coupon: { select: { id: true, code: true, description: true, active: true } },
      },
    });

    // Re-enqueue para regenerar mensagens do dia após edição
    const todayStr = new Date().toISOString().slice(0, 10);
    const jobId = `automatic-campaign:${id}:${todayStr}:admin-edit`;
    try {
      await this.automaticCampaignsQueue.add(
        QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE,
        { automaticCampaignId: id },
        { jobId },
      );
      this.logger.log(`Campanha automática ${id} re-enfileirada após edição admin (job ${jobId})`);
    } catch (err) {
      this.logger.error(
        `Campanha automática ${id}: falha ao enfileirar após edição admin`,
        err instanceof Error ? err.stack : err,
      );
    }

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.automaticCampaign.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string) {
    const campaign = await this.prisma.automaticCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campanha automática não encontrada');
    return this.prisma.automaticCampaign.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async updateStatus(id: string, status: AutomaticCampaignStatus) {
    await this.findOne(id);
    return this.prisma.automaticCampaign.update({
      where: { id },
      data: { status },
      include: {
        company: { select: { id: true, name: true } },
        campaignMetric: true,
      },
    });
  }

  async toggleActive(id: string) {
    const campaign = await this.findOne(id);
    await this.automaticCampaignService.toggleActive(id, campaign.companyId);
    return this.prisma.automaticCampaign.findUnique({
      where: { id },
      include: { company: { select: { id: true, name: true } } },
    });
  }

  async reprocess(id: string) {
    this.logger.log(`Admin reprocessando campanha automática ID: [${id}]`);

    const campaign = await this.prisma.automaticCampaign.findFirst({ where: { id } });

    if (!campaign) {
      throw new NotFoundException(`Campanha automática não encontrada (id=${id})`);
    }

    if (campaign.deletedAt) {
      throw new NotFoundException(`Campanha automática foi deletada e não pode ser reprocessada (id=${id})`);
    }

    await this.prisma.message.updateMany({
      where: {
        automaticCampaignId: id,
        status: { in: [MessageStatus.PENDING, MessageStatus.PROCESSING] },
      },
      data: { status: MessageStatus.ABORTED },
    });

    await this.prisma.automaticCampaign.update({
      where: { id },
      data: {
        status: AutomaticCampaignStatus.PROCESSING,
        lastProcessingError: null,
        lastProcessingErrorAt: null,
      },
    });

    const jobId = `automatic-campaign:${id}:admin-reprocess:${Date.now()}`;
    await this.automaticCampaignsQueue.add(
      QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE,
      { automaticCampaignId: id },
      { jobId },
    );

    this.logger.log(`Campanha automática ${id} enfileirada para reprocessamento admin (job ${jobId})`);

    return { message: 'Campanha automática enviada para reprocessamento com sucesso', campaignId: campaign.id };
  }

  async getMessages(id: string, filterDto: MessagesAdminFilterDto) {
    await this.findOne(id);

    const {
      page = 1, limit = 20, orderDirection = 'desc',
      status, channel, phone, customerName, startDate, endDate, error, hasSale,
    } = filterDto;

    const where: Prisma.MessageWhereInput = {
      automaticCampaignId: id,
      ...(status?.length && { status: { in: status } }),
      ...(channel && { channel }),
      ...(phone && { phone: { contains: phone } }),
      ...(customerName && { customerName: { contains: customerName, mode: 'insensitive' } }),
      ...(error && { error: { contains: error, mode: 'insensitive' } }),
      ...(hasSale === true && { MessageOrders: { some: {} } }),
      ...(hasSale === false && { MessageOrders: { none: {} } }),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) }),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: orderDirection },
        select: adminMessageSelect,
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      data: items.map(mapAdminCampaignMessage),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
