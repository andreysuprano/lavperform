import { WhatsappInstanceStatus } from '@prisma/client';
import { AdminWhatsappConnectionLinkService } from 'src/admin/whatsapp/admin-whatsapp-connection-link.service';

describe('AdminWhatsappConnectionLinkService', () => {
  const prisma: any = {
    whatsappConnectionLink: {
      findUnique: jest.fn(),
    },
  };

  const configService: any = { get: jest.fn() };
  const uazapiClient: any = {};
  const whatsappService: any = { getInstanceStatus: jest.fn() };
  const instanceRepository: any = {};

  let service: AdminWhatsappConnectionLinkService;

  function givenLink(instance: Record<string, unknown>) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    prisma.whatsappConnectionLink.findUnique = jest.fn().mockResolvedValue({
      companyId: 'comp1',
      company: { id: 'comp1', name: 'Lavanderia X' },
      whatsappInstance: instance,
      revokedAt: null,
      expiresAt,
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminWhatsappConnectionLinkService(
      prisma,
      configService,
      uazapiClient,
      whatsappService,
      instanceRepository,
    );
  });

  describe('getPublicSession', () => {
    it('exposes the stored phone number', async () => {
      givenLink({
        name: 'lavanderia-x',
        status: WhatsappInstanceStatus.CONNECTED,
        phoneNumber: '5511999990000',
      });

      const session = await service.getPublicSession('tok');

      expect(session.phoneNumber).toBe('5511999990000');
    });

    it('reports an empty stored number as null', async () => {
      givenLink({
        name: 'lavanderia-x',
        status: WhatsappInstanceStatus.PENDING,
        phoneNumber: '',
      });

      const session = await service.getPublicSession('tok');

      expect(session.phoneNumber).toBeNull();
    });
  });

  describe('getPublicStatus', () => {
    it('forwards the phone number returned by the whatsapp service', async () => {
      givenLink({
        name: 'lavanderia-x',
        status: WhatsappInstanceStatus.CONNECTED,
        phoneNumber: '5511999990000',
      });
      whatsappService.getInstanceStatus = jest.fn().mockResolvedValue({
        status: WhatsappInstanceStatus.CONNECTED,
        message: 'ok',
        phoneNumber: '5511999990000',
      });

      const status = await service.getPublicStatus('tok');

      expect(status).toEqual({
        companyName: 'Lavanderia X',
        status: WhatsappInstanceStatus.CONNECTED,
        message: 'ok',
        phoneNumber: '5511999990000',
      });
    });
  });
});
