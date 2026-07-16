import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CampaignStatus, MessageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { parseUTCDateStrict } from '../../common/utils/date.utils';
import { CampaignAdminFilterDto } from './dto/campaign-admin-filter.dto';
import { UpdateCampaignAdminDto } from './dto/update-campaign-admin.dto';
import { MessagesAdminFilterDto } from './dto/messages-admin-filter.dto';
import { CreateCampaignDto } from '../../campaigns/application/dto/create-campaign.dto';
import { normalizeCampaignTargeting } from '../../audiences/application/campaign-targeting.utils';
import {
  adminMessageSelect,
  mapAdminCampaignMessage,
} from './admin-campaign-messages.helper';

@Injectable()
export class AdminCampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.CAMPAIGNS_ENGINE)
    private readonly campaignsQueue: Queue,
  ) {}

  async findAll(filterDto: CampaignAdminFilterDto) {
    const {
      page = 1, limit = 20, orderBy = 'createdAt', orderDirection = 'desc',
      companyId, name, status, channel, modifiedByAI, startDate, endDate, trakingCode,
    } = filterDto;

    const where: Prisma.CampaignWhereInput = {
      ...(companyId && { companyId }),
      ...(name && { name: { contains: name, mode: 'insensitive' } }),
      ...(status && { status }),
      ...(channel && { channel }),
      ...(modifiedByAI !== undefined && { modifiedByAI }),
      ...(trakingCode && { trakingCode: { contains: trakingCode, mode: 'insensitive' } }),
      ...(startDate || endDate
        ? {
            scheduledDate: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) }),
            },
          }
        : {}),
    };

    const allowedOrderFields = ['createdAt', 'updatedAt', 'scheduledDate', 'name', 'status'];
    const safeOrderBy = allowedOrderFields.includes(orderBy) ? orderBy : 'createdAt';

    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [safeOrderBy]: orderDirection },
        include: {
          company: { select: { id: true, name: true } },
          campaignMetric: true,
        },
      }),
      this.prisma.campaign.count({ where }),
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
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        campaignMetric: true,
        messages: {
          where: { status: MessageStatus.ERROR },
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
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    return campaign;
  }

  async create(createCampaignDto: CreateCampaignDto & { companyId: string }) {
    const { companyId, ...data } = createCampaignDto;
    const targeting = normalizeCampaignTargeting(data);

    return this.prisma.campaign.create({
      data: {
        ...data,
        ...targeting,
        companyId,
        maxDailySends: data.maxDailySends ?? 50,
        scheduledDate: parseUTCDateStrict(data.scheduledDate),
        campaignMetric: { create: {} },
      },
      include: {
        company: { select: { id: true, name: true } },
        campaignMetric: true,
      },
    });
  }

  async update(id: string, updateDto: UpdateCampaignAdminDto) {
    await this.findOne(id);

    const { companyId: newCompanyId, scheduledDate, ...rest } = updateDto;
    const updateData: Prisma.CampaignUpdateInput = { ...rest };
    if (scheduledDate) {
      updateData.scheduledDate = parseUTCDateStrict(scheduledDate);
    }
    if (newCompanyId) {
      updateData.company = { connect: { id: newCompanyId } };
    }

    return this.prisma.campaign.update({
      where: { id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
        campaignMetric: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.campaign.delete({ where: { id } });
  }

  async updateStatus(id: string, status: CampaignStatus) {
    await this.findOne(id);
    return this.prisma.campaign.update({
      where: { id },
      data: { status },
      include: {
        company: { select: { id: true, name: true } },
        campaignMetric: true,
      },
    });
  }

  async reprocess(id: string) {
    const campaign = await this.findOne(id);

    await this.prisma.message.deleteMany({
      where: {
        campaignId: id,
        status: { in: [MessageStatus.PROCESSING, MessageStatus.PENDING] },
      },
    });

    await this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.WAITING },
    });

    await this.campaignsQueue.add(
      QUEUE_NAMES.CAMPAIGNS_ENGINE,
      { campaignId: id },
      { jobId: `campaign:${id}:admin-reprocess:${Date.now()}` },
    );

    return { message: 'Campanha enviada para reprocessamento com sucesso', campaignId: campaign.id };
  }

  async getMessages(id: string, filterDto: MessagesAdminFilterDto) {
    await this.findOne(id);

    const {
      page = 1, limit = 20, orderDirection = 'desc',
      status, channel, phone, customerName, startDate, endDate, error, hasSale,
    } = filterDto;

    const where: Prisma.MessageWhereInput = {
      campaignId: id,
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
