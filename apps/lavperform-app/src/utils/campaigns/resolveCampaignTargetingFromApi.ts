import type { AudienceTargetingMode } from '@/types'

type CampaignTargetingSource = {
  targetingMode?: AudienceTargetingMode
  audienceId?: string | null
  customSendListId?: string | null
  segmentation?: string | null
}

export function resolveCampaignTargetingFromApi(
  campaign: CampaignTargetingSource,
): {
  targetingMode: AudienceTargetingMode
  audienceId: string | null
  customSendListId: string | null
  segmentation: string[]
} {
  const segmentationArray = campaign.segmentation
    ? campaign.segmentation
        .split(',')
        .map((seg) => seg.trim())
        .filter(Boolean)
    : []

  const audienceSegment =
    segmentationArray.length === 1 && segmentationArray[0].startsWith('audience:')
      ? segmentationArray[0].slice('audience:'.length)
      : null

  const customListSegment =
    segmentationArray.length === 1 &&
    segmentationArray[0].startsWith('custom-send-list:')
      ? segmentationArray[0].slice('custom-send-list:'.length)
      : null

  if (
    campaign.targetingMode === 'CUSTOMER_LIST' ||
    customListSegment !== null
  ) {
    return {
      targetingMode: 'CUSTOMER_LIST',
      audienceId: null,
      customSendListId: campaign.customSendListId ?? customListSegment,
      segmentation: [],
    }
  }

  const isAudienceMode =
    campaign.targetingMode === 'AUDIENCE' || audienceSegment !== null

  if (isAudienceMode) {
    return {
      targetingMode: 'AUDIENCE',
      audienceId: campaign.audienceId ?? audienceSegment,
      customSendListId: null,
      segmentation: [],
    }
  }

  return {
    targetingMode: campaign.targetingMode ?? 'RFV',
    audienceId: null,
    customSendListId: null,
    segmentation: segmentationArray,
  }
}
