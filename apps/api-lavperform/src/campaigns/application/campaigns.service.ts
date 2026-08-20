import { Injectable, NotFoundException, Inject, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CampaignFilterDto } from './dto/campaign-filter.dto';
import { ICampaignRepository } from '../domain/campaign.repository.interface';
import { AudienceTargetingMode, CampaignStatus, MessageStatus } from '@prisma/client';
import { parseUTCDate } from '../../common/utils/date.utils';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { normalizeCampaignTargeting } from '../../audiences/application/campaign-targeting.utils';
import { CustomSendListsService } from '../../custom-send-lists/application/custom-send-lists.service';

@Injectable()
export class CampaignsService {
  constructor(
    @Inject('ICampaignRepository')
    private readonly campaignRepository: ICampaignRepository,
    private readonly prisma: PrismaService,
    private readonly customSendListsService: CustomSendListsService,
    @InjectQueue(QUEUE_NAMES.CAMPAIGNS_ENGINE)
    private readonly campaignsQueue: Queue,
  ) { }

  async create(companyId: string, createCampaignDto: CreateCampaignDto) {
    const targeting = normalizeCampaignTargeting(createCampaignDto);

    if (targeting.targetingMode === AudienceTargetingMode.AUDIENCE) {
      await this.assertAudienceBelongsToCompany(companyId, targeting.audienceId!);
    }

    if (targeting.targetingMode === AudienceTargetingMode.CUSTOMER_LIST) {
      await this.customSendListsService.assertCustomSendListBelongsToCompany(
        companyId,
        targeting.customSendListId!,
      );
    }

    return await this.campaignRepository.createWithMetric({
      ...createCampaignDto,
      ...targeting,
      maxDailySends: createCampaignDto.maxDailySends ?? 50,
      scheduledDate: parseUTCDate(createCampaignDto.scheduledDate),
      companyId,
    });
  }

  async findAll(companyId: string, paginationDto: PaginationDto, filterDto: CampaignFilterDto) {
    const { page, limit } = paginationDto;
    const { items, total } = await this.campaignRepository.findAllWithFilters(companyId, paginationDto, filterDto);

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
    const campaign = await this.campaignRepository.findById(id);

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    return campaign;
  }

  async update(id: string, updateCampaignDto: UpdateCampaignDto) {
    const campaign = await this.findOne(id);
    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    const updateData: any = { ...updateCampaignDto };
    if (updateCampaignDto.scheduledDate) {
      updateData.scheduledDate = parseUTCDate(updateCampaignDto.scheduledDate);
    }

    if (
      updateCampaignDto.targetingMode !== undefined ||
      updateCampaignDto.segmentation !== undefined ||
      updateCampaignDto.audienceId !== undefined ||
      updateCampaignDto.customSendListId !== undefined
    ) {
      const targeting = normalizeCampaignTargeting({
        targetingMode: updateCampaignDto.targetingMode ?? (campaign as any).targetingMode,
        segmentation: updateCampaignDto.segmentation ?? campaign.segmentation,
        audienceId: updateCampaignDto.audienceId ?? (campaign as any).audienceId,
        customSendListId:
          updateCampaignDto.customSendListId ?? (campaign as any).customSendListId,
      });

      if (targeting.targetingMode === AudienceTargetingMode.AUDIENCE) {
        await this.assertAudienceBelongsToCompany(campaign.companyId, targeting.audienceId!);
      }

      if (targeting.targetingMode === AudienceTargetingMode.CUSTOMER_LIST) {
        await this.customSendListsService.assertCustomSendListBelongsToCompany(
          campaign.companyId,
          targeting.customSendListId!,
        );
      }

      Object.assign(updateData, targeting);
    }

    return this.campaignRepository.update(id, updateData);
  }

  private async assertAudienceBelongsToCompany(companyId: string, audienceId: string) {
    const audience = await this.prisma.audience.findFirst({
      where: { id: audienceId, companyId, deletedAt: null },
    });

    if (!audience) {
      throw new BadRequestException('Audiência não encontrada para esta empresa');
    }
  }

  async remove(id: string) {
    const campaign = await this.findOne(id);
    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }
    return this.campaignRepository.delete(id);
  }

  async updateStatus(id: string, status: CampaignStatus) {
    const campaign = await this.findOne(id);
    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }
    return this.campaignRepository.updateStatus(id, status);
  }

  async reprocess(id: string) {
    const campaign = await this.findOne(id);

    await this.prisma.message.deleteMany({
      where: {
        campaignId: id,
        status: { in: [MessageStatus.PROCESSING, MessageStatus.PENDING] },
      },
    });

    await this.campaignRepository.updateStatus(id, CampaignStatus.WAITING);

    await this.campaignsQueue.add(
      QUEUE_NAMES.CAMPAIGNS_ENGINE,
      { campaignId: id },
      { jobId: `campaign:${id}:reprocess:${Date.now()}` },
    );

    return { message: 'Campanha enviada para reprocessamento com sucesso', campaignId: campaign.id };
  }
}