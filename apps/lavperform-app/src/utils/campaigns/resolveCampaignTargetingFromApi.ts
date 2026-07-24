import type { AudienceTargetingMode } from '@/types'

type CampaignTargetingSource = {
  targetingMode?: AudienceTargetingMode
  audienceId?: string | null
  segmentation?: string | null
}

export function resolveCampaignTargetingFromApi(
  campaign: CampaignTargetingSource,
): {
  targetingMode: AudienceTargetingMode
  audienceId: string | null
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

  const isAudienceMode =
    campaign.targetingMode === 'AUDIENCE' || audienceSegment !== null

  if (isAudienceMode) {
    return {
      targetingMode: 'AUDIENCE',
      audienceId: campaign.audienceId ?? audienceSegment,
      segmentation: [],
    }
  }

  return {
    targetingMode: campaign.targetingMode ?? 'RFV',
    audienceId: null,
    segmentation: segmentationArray,
  }
}
