import { BadRequestException } from '@nestjs/common';
import { AudienceTargetingMode } from '@prisma/client';

export interface CampaignTargetingInput {
  targetingMode?: AudienceTargetingMode;
  segmentation?: string;
  audienceId?: string | null;
}

export function normalizeCampaignTargeting(input: CampaignTargetingInput): {
  targetingMode: AudienceTargetingMode;
  segmentation: string;
  audienceId: string | null;
} {
  const targetingMode = input.targetingMode ?? AudienceTargetingMode.RFV;

  if (targetingMode === AudienceTargetingMode.AUDIENCE) {
    if (!input.audienceId) {
      throw new BadRequestException('Audiência é obrigatória quando targetingMode é AUDIENCE');
    }

    return {
      targetingMode,
      audienceId: input.audienceId,
      segmentation: `audience:${input.audienceId}`,
    };
  }

  if (!input.segmentation?.trim()) {
    throw new BadRequestException('Segmentação RFV é obrigatória quando targetingMode é RFV');
  }

  return {
    targetingMode,
    audienceId: null,
    segmentation: input.segmentation.trim(),
  };
}
