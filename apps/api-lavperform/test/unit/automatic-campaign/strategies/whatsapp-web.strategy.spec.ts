import { CampaignChannel, MessageStatus } from '@prisma/client';

const getRandomArbitraryMock = jest.fn();
const getScheduleDateForSendWindowMock = jest.fn().mockReturnValue(new Date('2024-01-01T12:00:00.000Z'));
const nowUTCMock = jest.fn().mockReturnValue(new Date('2024-01-01T12:00:00.000Z'));
const generateUniqueTokenMock = jest.fn().mockReturnValue('ABCDEF');

jest.mock('src/common/utils/randomArbitrary', () => ({
  getRandomArbitrary: getRandomArbitraryMock,
}));

jest.mock('src/automatic-campaign/application/campaign-send-schedule.utils', () => ({
  getScheduleDateForSendWindow: getScheduleDateForSendWindowMock,
}));

jest.mock('src/common/utils/date.utils', () => ({
  nowUTC: nowUTCMock,
  startOfDayInTz: jest.fn().mockReturnValue(new Date('2024-01-01T03:00:00.000Z')),
  endOfDayInTz: jest.fn().mockReturnValue(new Date('2024-01-02T02:59:59.999Z')),
}));

jest.mock('src/common/utils/generateUniqueToken', () => ({
  generateUniqueToken: generateUniqueTokenMock,
}));

import { WhatsappWebStrategy } from 'src/automatic-campaign/infrastructure/strategies/whatsapp-web.strategy';

describe('WhatsappWebStrategy', () => {
  let strategy: WhatsappWebStrategy;
  const defaultSendTimeWindow = {
    openTime: '10:00',
    closeTime: '18:00',
    mode: 'random' as const,
  };
  const prisma: any = {
    message: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'msg' }),
    },
  };
  const openai: any = {
    generateMessage: jest.fn().mockResolvedValue({ message: 'Oi cliente!' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.message.findFirst.mockResolvedValue(null);
    prisma.message.create.mockResolvedValue({ id: 'msg' });
    openai.generateMessage.mockResolvedValue({ message: 'Oi cliente!' });
    process.env.REDIRECT_URL = 'https://r.test';
    strategy = new WhatsappWebStrategy(prisma, openai);
  });

  it('exposes the WHATSAPP_WEB channel', () => {
    expect(strategy.channel).toBe(CampaignChannel.WHATSAPP_WEB);
  });

  it('uses random creative/image and persists redirectUrl when creatives exist', async () => {
    getRandomArbitraryMock.mockReturnValueOnce(0).mockReturnValueOnce(1);

    await strategy.generateMessages({
      campaign: {
        id: 'ac1',
        companyId: 'comp1',
        segmentation: 'segA',
        images: null,
        messageText: 'fallback',
        channel: CampaignChannel.WHATSAPP_WEB,
        creatives: [
          {
            id: 'cr1',
            imageUrls: ['img-a.jpg', 'img-b.jpg'],
            title: 't',
            message: 'creative message',
            link: 'https://promo.test',
          },
        ],
        coupon: null,
      } as any,
      customers: [{ id: 'c1', name: 'Alice', phone: '11' } as any],
      sendTimeWindow: defaultSendTimeWindow,
      alreadySentToday: 0,
      maxDailySends: 50,
    });

    expect(openai.generateMessage).toHaveBeenCalledWith({
      customerName: 'Alice',
      messageText: 'creative message',
      linkCardapio: 'https://r.test/c/ABCDEF',
      couponCode: undefined,
    });
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        automaticCampaignId: 'ac1',
        messageText: 'Oi cliente!',
        mediaUrl: 'img-b.jpg',
        redirectUrl: 'https://promo.test',
        couponCode: null,
        status: MessageStatus.PENDING,
      }),
    });
  });

  it('falls back to legacy images when no creatives are defined', async () => {
    getRandomArbitraryMock.mockReturnValueOnce(0);

    await strategy.generateMessages({
      campaign: {
        id: 'ac1',
        companyId: 'comp1',
        segmentation: 'segA',
        images: 'legacy-img-1.jpg,legacy-img-2.jpg',
        messageText: 'legacy text',
        channel: CampaignChannel.WHATSAPP_WEB,
        creatives: [],
        coupon: null,
      } as any,
      customers: [{ id: 'c1', name: 'Bob', phone: '22' } as any],
      sendTimeWindow: defaultSendTimeWindow,
      alreadySentToday: 0,
      maxDailySends: 50,
    });

    expect(openai.generateMessage).toHaveBeenCalledWith(
      expect.objectContaining({ messageText: 'legacy text', couponCode: undefined }),
    );
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        mediaUrl: 'legacy-img-1.jpg',
        redirectUrl: null,
      }),
    });
  });

  it('passes couponCode to OpenAI and persists on message when coupon is active and valid', async () => {
    getRandomArbitraryMock.mockReturnValueOnce(0).mockReturnValueOnce(0);

    await strategy.generateMessages({
      campaign: {
        id: 'ac1',
        companyId: 'comp1',
        segmentation: 'segA',
        images: null,
        messageText: 'x',
        channel: CampaignChannel.WHATSAPP_WEB,
        creatives: [
          { id: 'cr1', imageUrls: ['i.jpg'], title: 't', message: 'm', link: null },
        ],
        coupon: {
          id: 'cp1',
          code: 'PROMO10',
          active: true,
          validUntil: new Date('2030-01-01T00:00:00.000Z'),
        },
      } as any,
      customers: [{ id: 'c1', name: 'Carla', phone: '33' } as any],
      sendTimeWindow: defaultSendTimeWindow,
      alreadySentToday: 0,
      maxDailySends: 50,
    });

    expect(openai.generateMessage).toHaveBeenCalledWith(
      expect.objectContaining({ couponCode: 'PROMO10' }),
    );
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ couponCode: 'PROMO10' }),
    });
  });

  it('ignores coupon when it is inactive or expired', async () => {
    getRandomArbitraryMock.mockReturnValueOnce(0).mockReturnValueOnce(0);

    await strategy.generateMessages({
      campaign: {
        id: 'ac1',
        companyId: 'comp1',
        segmentation: 'segA',
        images: null,
        messageText: 'x',
        channel: CampaignChannel.WHATSAPP_WEB,
        creatives: [
          { id: 'cr1', imageUrls: ['i.jpg'], title: 't', message: 'm', link: null },
        ],
        coupon: {
          id: 'cp1',
          code: 'OLD',
          active: true,
          validUntil: new Date('2020-01-01T00:00:00.000Z'),
        },
      } as any,
      customers: [{ id: 'c1', name: 'Dan', phone: '44' } as any],
      sendTimeWindow: defaultSendTimeWindow,
      alreadySentToday: 0,
      maxDailySends: 50,
    });

    expect(openai.generateMessage).toHaveBeenCalledWith(
      expect.objectContaining({ couponCode: undefined }),
    );
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ couponCode: null }),
    });
  });

  it('skips customer when a message already exists for today', async () => {
    prisma.message.findFirst.mockResolvedValueOnce({ id: 'existing' });

    await strategy.generateMessages({
      campaign: {
        id: 'ac1',
        companyId: 'comp1',
        segmentation: 'segA',
        images: 'img.jpg',
        messageText: 't',
        channel: CampaignChannel.WHATSAPP_WEB,
        creatives: [],
        coupon: null,
      } as any,
      customers: [{ id: 'c1', name: 'Eve', phone: '55' } as any],
      sendTimeWindow: defaultSendTimeWindow,
      alreadySentToday: 0,
      maxDailySends: 50,
    });

    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('uses fixed schedule helper when sendTimeWindow mode is fixed', async () => {
    getRandomArbitraryMock.mockReturnValueOnce(0);

    await strategy.generateMessages({
      campaign: {
        id: 'ac1',
        companyId: 'comp1',
        segmentation: 'segA',
        images: 'img.jpg',
        messageText: 't',
        channel: CampaignChannel.WHATSAPP_WEB,
        creatives: [],
        coupon: null,
      } as any,
      customers: [{ id: 'c1', name: 'Frank', phone: '66' } as any],
      sendTimeWindow: { openTime: '14:00', closeTime: '14:00', mode: 'fixed' },
      alreadySentToday: 0,
      maxDailySends: 50,
    });

    expect(getScheduleDateForSendWindowMock).toHaveBeenCalledWith({
      openTime: '14:00',
      closeTime: '14:00',
      mode: 'fixed',
    });
  });
});
