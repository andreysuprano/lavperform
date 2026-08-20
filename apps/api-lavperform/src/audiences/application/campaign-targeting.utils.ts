import { BadRequestException } from '@nestjs/common';
import { AudienceTargetingMode } from '@prisma/client';

export interface CampaignTargetingInput {
  targetingMode?: AudienceTargetingMode;
  segmentation?: string;
  audienceId?: string | null;
  customSendListId?: string | null;
}

export function normalizeCampaignTargeting(input: CampaignTargetingInput): {
  targetingMode: AudienceTargetingMode;
  segmentation: string;
  audienceId: string | null;
  customSendListId: string | null;
} {
  const targetingMode = input.targetingMode ?? AudienceTargetingMode.RFV;

  if (targetingMode === AudienceTargetingMode.AUDIENCE) {
    if (!input.audienceId) {
      throw new BadRequestException('Audiência é obrigatória quando targetingMode é AUDIENCE');
    }

    return {
      targetingMode,
      audienceId: input.audienceId,
      customSendListId: null,
      segmentation: `audience:${input.audienceId}`,
    };
  }

  if (targetingMode === AudienceTargetingMode.CUSTOMER_LIST) {
    if (!input.customSendListId) {
      throw new BadRequestException(
        'Lista personalizada é obrigatória quando targetingMode é CUSTOMER_LIST',
      );
    }

    return {
      targetingMode,
      audienceId: null,
      customSendListId: input.customSendListId,
      segmentation: `custom-send-list:${input.customSendListId}`,
    };
  }

  if (!input.segmentation?.trim()) {
    throw new BadRequestException('Segmentação RFV é obrigatória quando targetingMode é RFV');
  }

  return {
    targetingMode,
    audienceId: null,
    customSendListId: null,
    segmentation: input.segmentation.trim(),
  };
}
