import { BadRequestException } from '@nestjs/common';
import { AudienceTargetingMode } from '@prisma/client';
import { normalizeCampaignTargeting } from './campaign-targeting.utils';

describe('normalizeCampaignTargeting', () => {
  it('normalizes RFV targeting', () => {
    const result = normalizeCampaignTargeting({
      targetingMode: AudienceTargetingMode.RFV,
      segmentation: 'campeao,fiel',
    });

    expect(result).toEqual({
      targetingMode: AudienceTargetingMode.RFV,
      segmentation: 'campeao,fiel',
      audienceId: null,
      customSendListId: null,
    });
  });

  it('normalizes AUDIENCE targeting', () => {
    const audienceId = '11111111-1111-4111-8111-111111111111';

    const result = normalizeCampaignTargeting({
      targetingMode: AudienceTargetingMode.AUDIENCE,
      audienceId,
    });

    expect(result).toEqual({
      targetingMode: AudienceTargetingMode.AUDIENCE,
      segmentation: `audience:${audienceId}`,
      audienceId,
      customSendListId: null,
    });
  });

  it('normalizes CUSTOMER_LIST targeting', () => {
    const listId = '22222222-2222-4222-8222-222222222222';

    const result = normalizeCampaignTargeting({
      targetingMode: AudienceTargetingMode.CUSTOMER_LIST,
      customSendListId: listId,
    });

    expect(result).toEqual({
      targetingMode: AudienceTargetingMode.CUSTOMER_LIST,
      segmentation: `custom-send-list:${listId}`,
      audienceId: null,
      customSendListId: listId,
    });
  });

  it('throws when AUDIENCE mode has no audienceId', () => {
    expect(() =>
      normalizeCampaignTargeting({
        targetingMode: AudienceTargetingMode.AUDIENCE,
      }),
    ).toThrow(BadRequestException);
  });

  it('throws when CUSTOMER_LIST mode has no customSendListId', () => {
    expect(() =>
      normalizeCampaignTargeting({
        targetingMode: AudienceTargetingMode.CUSTOMER_LIST,
      }),
    ).toThrow(BadRequestException);
  });

  it('throws when RFV mode has empty segmentation', () => {
    expect(() =>
      normalizeCampaignTargeting({
        targetingMode: AudienceTargetingMode.RFV,
        segmentation: '   ',
      }),
    ).toThrow(BadRequestException);
  });
});
