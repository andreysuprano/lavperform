import { AutomaticCampaignType } from '@prisma/client';

export const CREATABLE_AUTOMATIC_CAMPAIGN_TYPES = [
  AutomaticCampaignType.RECOGNITION,
  AutomaticCampaignType.SALES,
] as const;

export type CreatableAutomaticCampaignType =
  (typeof CREATABLE_AUTOMATIC_CAMPAIGN_TYPES)[number];

export function isCreatableAutomaticCampaignType(
  type: AutomaticCampaignType,
): type is CreatableAutomaticCampaignType {
  return CREATABLE_AUTOMATIC_CAMPAIGN_TYPES.includes(
    type as CreatableAutomaticCampaignType,
  );
}
