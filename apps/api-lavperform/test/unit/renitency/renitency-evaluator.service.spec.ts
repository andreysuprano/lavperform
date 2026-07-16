import { CampaignChannel, MessageStatus } from '@prisma/client';
import { RenitencyEvaluatorService, RenitencyContext } from 'src/renitency/application/renitency-evaluator.service';

describe('RenitencyEvaluatorService', () => {
  const prisma: any = {
    message: { findFirst: jest.fn() },
  };

  const renitencyService: any = {
    getOrCreateConfiguration: jest.fn(),
  };

  let evaluator: RenitencyEvaluatorService;

  beforeEach(() => {
    jest.clearAllMocks();
    evaluator = new RenitencyEvaluatorService(prisma, renitencyService);
    renitencyService.getOrCreateConfiguration.mockResolvedValue({
      id: 'config1',
      companyId: 'comp1',
      minDaysBetween: 3,
    });
  });

  describe('shouldApplyRenitency', () => {
    it('returns false for manual campaign (campaignId only)', () => {
      expect(evaluator.shouldApplyRenitency({
        campaignId: 'camp1',
        automaticCampaignId: null,
        weatherAlertHistoryId: null,
      })).toBe(false);
    });

    it('returns true for automatic campaign', () => {
      expect(evaluator.shouldApplyRenitency({
        campaignId: null,
        automaticCampaignId: 'auto1',
        weatherAlertHistoryId: null,
      })).toBe(true);
    });

    it('returns true for weather alert', () => {
      expect(evaluator.shouldApplyRenitency({
        campaignId: null,
        automaticCampaignId: null,
        weatherAlertHistoryId: 'weather1',
      })).toBe(true);
    });

    it('returns false when no source is set', () => {
      expect(evaluator.shouldApplyRenitency({
        campaignId: null,
        automaticCampaignId: null,
        weatherAlertHistoryId: null,
      })).toBe(false);
    });
  });

  describe('canContactCustomer', () => {
    const baseCtx: RenitencyContext = {
      companyId: 'comp1',
      customerId: 'cust1',
      channel: CampaignChannel.SMS,
      automaticCampaignId: 'auto1',
    };

    it('allows manual campaigns without checking renitency', async () => {
      const ctx: RenitencyContext = {
        companyId: 'comp1',
        customerId: 'cust1',
        channel: CampaignChannel.SMS,
        campaignId: 'camp1',
      };

      const result = await evaluator.canContactCustomer(ctx);

      expect(result.allowed).toBe(true);
      expect(prisma.message.findFirst).not.toHaveBeenCalled();
    });

    it('allows when customer has no previous messages on channel', async () => {
      prisma.message.findFirst.mockResolvedValue(null);

      const result = await evaluator.canContactCustomer(baseCtx);

      expect(result.allowed).toBe(true);
    });

    it('blocks when last message was sent recently', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      prisma.message.findFirst.mockResolvedValue({ updatedAt: yesterday });

      const result = await evaluator.canContactCustomer(baseCtx);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('RENITENCY_BLOCKED');
      expect(result.nextEligibleAt).toBeInstanceOf(Date);
    });

    it('allows when last message is older than minDaysBetween', async () => {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      prisma.message.findFirst.mockResolvedValue({ updatedAt: fiveDaysAgo });

      const result = await evaluator.canContactCustomer(baseCtx);

      expect(result.allowed).toBe(true);
    });

    it('queries grouped WhatsApp channels for WHATSAPP_WEB', async () => {
      prisma.message.findFirst.mockResolvedValue(null);

      await evaluator.canContactCustomer({
        ...baseCtx,
        channel: CampaignChannel.WHATSAPP_WEB,
      });

      expect(prisma.message.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            channel: { in: [CampaignChannel.WHATSAPP_WEB, CampaignChannel.WHATSAPP_BUSINESS_API] },
          }),
        }),
      );
    });

    it('queries grouped WhatsApp channels for WHATSAPP_BUSINESS_API', async () => {
      prisma.message.findFirst.mockResolvedValue(null);

      await evaluator.canContactCustomer({
        ...baseCtx,
        channel: CampaignChannel.WHATSAPP_BUSINESS_API,
      });

      expect(prisma.message.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            channel: { in: [CampaignChannel.WHATSAPP_WEB, CampaignChannel.WHATSAPP_BUSINESS_API] },
          }),
        }),
      );
    });

    it('queries only SMS channel for SMS', async () => {
      prisma.message.findFirst.mockResolvedValue(null);

      await evaluator.canContactCustomer({
        ...baseCtx,
        channel: CampaignChannel.SMS,
      });

      expect(prisma.message.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            channel: { in: [CampaignChannel.SMS] },
            status: MessageStatus.SENT,
          }),
        }),
      );
    });

    it('allows same customer on different channel even when blocked on another', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      prisma.message.findFirst
        .mockResolvedValueOnce({ updatedAt: yesterday })
        .mockResolvedValueOnce(null);

      const blockedOnWhatsApp = await evaluator.canContactCustomer({
        ...baseCtx,
        channel: CampaignChannel.WHATSAPP_WEB,
      });
      expect(blockedOnWhatsApp.allowed).toBe(false);

      const allowedOnSms = await evaluator.canContactCustomer({
        ...baseCtx,
        channel: CampaignChannel.SMS,
      });
      expect(allowedOnSms.allowed).toBe(true);
    });
  });
});
