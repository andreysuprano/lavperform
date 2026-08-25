import { Injectable, NotFoundException } from '@nestjs/common';
import { AudienceTargetingMode, CampaignChannel, Customer, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CAMPAIGN_CUSTOMER_ORDER_BY } from '../../common/utils/campaign-customer-order.utils';
import { AudienceQueryEngine } from './audience-query.engine';
import { AudienceDefinition } from '../domain/audience-definition.types';

export interface ResolveCampaignCustomersParams {
  companyId: string;
  targetingMode: AudienceTargetingMode;
  segmentation?: string;
  audienceId?: string | null;
  customSendListId?: string | null;
  channel: CampaignChannel;
  take?: number;
}

@Injectable()
export class CampaignCustomerResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audienceQueryEngine: AudienceQueryEngine,
  ) {}

  async resolveCustomers(params: ResolveCampaignCustomersParams): Promise<Customer[]> {
    const isSms = params.channel === CampaignChannel.SMS;
    const channelFilter: Prisma.CustomerWhereInput = isSms
      ? {}
      : { whatsappOptin: true, whatsappVerified: true };

    let customerIds: string[] | null = null;

    if (params.targetingMode === AudienceTargetingMode.AUDIENCE) {
      if (!params.audienceId) {
        throw new NotFoundException('Audiência não informada para a campanha');
      }

      const audience = await this.prisma.audience.findFirst({
        where: {
          id: params.audienceId,
          companyId: params.companyId,
          deletedAt: null,
        },
      });

      if (!audience) {
        throw new NotFoundException('Audiência não encontrada');
      }

      customerIds = await this.audienceQueryEngine.resolveCustomerIds(
        params.companyId,
        audience.definition as unknown as AudienceDefinition,
      );
    }

    if (params.targetingMode === AudienceTargetingMode.CUSTOMER_LIST) {
      if (!params.customSendListId) {
        throw new NotFoundException('Lista personalizada não informada para a campanha');
      }

      const list = await this.prisma.customSendList.findFirst({
        where: {
          id: params.customSendListId,
          companyId: params.companyId,
          deletedAt: null,
        },
      });

      if (!list) {
        throw new NotFoundException('Lista personalizada não encontrada');
      }

      const members = await this.prisma.customSendListMember.findMany({
        where: { listId: params.customSendListId },
        select: { customerId: true },
      });

      customerIds = members.map((member) => member.customerId);
    }

    const where: Prisma.CustomerWhereInput = {
      companyId: params.companyId,
      ...channelFilter,
      ...(customerIds !== null ? { id: { in: customerIds.length ? customerIds : ['__none__'] } } : {}),
      ...(params.targetingMode === AudienceTargetingMode.RFV && params.segmentation
        ? {
            rfvClassification: {
              in: params.segmentation.replaceAll(' ', '').split(','),
            },
          }
        : {}),
    };

    return this.prisma.customer.findMany({
      where,
      orderBy: CAMPAIGN_CUSTOMER_ORDER_BY,
      ...(params.take ? { take: params.take } : {}),
    });
  }

  async countEligibleCustomers(params: ResolveCampaignCustomersParams): Promise<number> {
    const customers = await this.resolveCustomers(params);
    return customers.length;
  }

  resolveSegmentationLabel(params: {
    targetingMode: AudienceTargetingMode;
    segmentation?: string;
    audienceName?: string | null;
    customSendListName?: string | null;
  }): string {
    if (params.targetingMode === AudienceTargetingMode.AUDIENCE) {
      return params.audienceName ? `audience:${params.audienceName}` : 'audience:custom';
    }

    if (params.targetingMode === AudienceTargetingMode.CUSTOMER_LIST) {
      return params.customSendListName
        ? `lista:${params.customSendListName}`
        : 'lista:custom';
    }

    return params.segmentation ?? '';
  }
}
