import { Injectable } from '@nestjs/common';
import { AudienceTargetingMode } from '@prisma/client';
import { CampaignCustomerResolverService } from '../../audiences/application/campaign-customer-resolver.service';
import { ReachPreviewDto } from './dto/reach-preview.dto';
import { ReachPreviewResponseDto } from './dto/reach-preview-response.dto';

@Injectable()
export class AutomaticCampaignReachService {
  constructor(
    private readonly campaignCustomerResolver: CampaignCustomerResolverService,
  ) {}

  async preview(
    companyId: string,
    dto: ReachPreviewDto,
  ): Promise<ReachPreviewResponseDto> {
    const targetingMode = dto.targetingMode ?? AudienceTargetingMode.RFV;
    const count = await this.campaignCustomerResolver.countEligibleCustomers({
      companyId,
      targetingMode,
      segmentation: dto.segmentation,
      audienceId: dto.audienceId,
      customSendListId: dto.customSendListId,
      channel: dto.channel,
      ...(dto.channel ? { eligibility: 'contactable' as const } : {}),
    });

    return { count };
  }
}
