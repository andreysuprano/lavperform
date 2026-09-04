import { Injectable, NotFoundException } from '@nestjs/common';
import { AudienceTargetingMode, CampaignChannel, Customer, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CAMPAIGN_CUSTOMER_ORDER_BY } from '../../common/utils/campaign-customer-order.utils';
import { buildFreshWhatsappCustomerFilter } from '../../whatsapp/application/whatsapp-verification.policy';
import { AudienceQueryEngine } from './audience-query.engine';
import { AudienceDefinition } from '../domain/audience-definition.types';

export interface ResolveCampaignCustomersParams {
  companyId: string;
  targetingMode: AudienceTargetingMode;
  segmentation?: string;
  audienceId?: string | null;
  customSendListId?: string | null;
  channel?: CampaignChannel;
  eligibility?: 'fresh' | 'contactable';
  take?: number;
}

const REAL_PHONE_FILTER: Prisma.CustomerWhereInput = {
  phone: { not: null },
  NOT: {
    phone: {
      startsWith: 'cpf:',
    },
  },
};

@Injectable()
export class CampaignCustomerResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audienceQueryEngine: AudienceQueryEngine,
  ) {}

  async resolveCustomers(params: ResolveCampaignCustomersParams): Promise<Customer[]> {
    const where = await this.buildCustomerWhere(params);

    return this.prisma.customer.findMany({
      where,
      orderBy: CAMPAIGN_CUSTOMER_ORDER_BY,
      ...(params.take ? { take: params.take } : {}),
    });
  }

  async countEligibleCustomers(params: ResolveCampaignCustomersParams): Promise<number> {
    const where = await this.buildCustomerWhere(params);
    return this.prisma.customer.count({ where });
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

  private async buildCustomerWhere(
    params: ResolveCampaignCustomersParams,
  ): Promise<Prisma.CustomerWhereInput> {
    const customerIds = await this.resolveTargetCustomerIds(params);

    return {
      companyId: params.companyId,
      ...this.buildChannelFilter(params.channel, params.eligibility),
      ...(customerIds !== null ? { id: { in: customerIds.length ? customerIds : ['__none__'] } } : {}),
      ...(params.targetingMode === AudienceTargetingMode.RFV && params.segmentation
        ? {
            rfvClassification: {
              in: params.segmentation.replaceAll(' ', '').split(','),
            },
          }
        : {}),
    };
  }

  private buildChannelFilter(
    channel?: CampaignChannel,
    eligibility: 'fresh' | 'contactable' = 'fresh',
  ): Prisma.CustomerWhereInput {
    if (!channel) {
      return {};
    }

    if (
      channel === CampaignChannel.WHATSAPP_WEB ||
      channel === CampaignChannel.WHATSAPP_BUSINESS_API
    ) {
      if (eligibility === 'contactable') {
        return {
          whatsappOptin: true,
          whatsappVerified: true,
          ...REAL_PHONE_FILTER,
        };
      }

      return buildFreshWhatsappCustomerFilter();
    }

    if (channel === CampaignChannel.SMS) {
      return REAL_PHONE_FILTER;
    }

    if (channel === CampaignChannel.EMAIL) {
      return { email: { not: null } };
    }

    return {};
  }

  private async resolveTargetCustomerIds(
    params: ResolveCampaignCustomersParams,
  ): Promise<string[] | null> {
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

      return this.audienceQueryEngine.resolveCustomerIds(
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

      return members.map((member) => member.customerId);
    }

    return null;
  }
}
