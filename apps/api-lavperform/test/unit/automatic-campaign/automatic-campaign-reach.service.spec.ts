import { AudienceTargetingMode, CampaignChannel } from '@prisma/client';
import { AutomaticCampaignReachService } from 'src/automatic-campaign/application/automatic-campaign-reach.service';
import { CampaignCustomerResolverService } from 'src/audiences/application/campaign-customer-resolver.service';

describe('AutomaticCampaignReachService', () => {
  const resolver = {
    countEligibleCustomers: jest.fn(),
  };

  let service: AutomaticCampaignReachService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AutomaticCampaignReachService(
      resolver as unknown as CampaignCustomerResolverService,
    );
  });

  it('preview with channel delegates count as contactable and returns { count }', async () => {
    resolver.countEligibleCustomers.mockResolvedValue(42);

    const result = await service.preview('company-1', {
      targetingMode: AudienceTargetingMode.RFV,
      segmentation: 'campeao,fiel',
      channel: CampaignChannel.WHATSAPP_WEB,
    });

    expect(result).toEqual({ count: 42 });
    expect(resolver.countEligibleCustomers).toHaveBeenCalledWith({
      companyId: 'company-1',
      targetingMode: AudienceTargetingMode.RFV,
      segmentation: 'campeao,fiel',
      audienceId: undefined,
      customSendListId: undefined,
      channel: CampaignChannel.WHATSAPP_WEB,
      eligibility: 'contactable',
    });
  });

  it('preview without channel does not pass eligibility or channel filter', async () => {
    resolver.countEligibleCustomers.mockResolvedValue(10);

    const result = await service.preview('company-1', {
      targetingMode: AudienceTargetingMode.AUDIENCE,
      audienceId: 'aud-1',
    });

    expect(result).toEqual({ count: 10 });
    expect(resolver.countEligibleCustomers).toHaveBeenCalledWith({
      companyId: 'company-1',
      targetingMode: AudienceTargetingMode.AUDIENCE,
      segmentation: undefined,
      audienceId: 'aud-1',
      customSendListId: undefined,
      channel: undefined,
    });
    expect(resolver.countEligibleCustomers.mock.calls[0][0]).not.toHaveProperty('eligibility');
  });

  it('preview defaults targetingMode to RFV when omitted', async () => {
    resolver.countEligibleCustomers.mockResolvedValue(3);

    await service.preview('company-1', {
      segmentation: 'campeao',
    });

    expect(resolver.countEligibleCustomers).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        targetingMode: AudienceTargetingMode.RFV,
        segmentation: 'campeao',
      }),
    );
  });
});
