import { WhatsappCompanyConnectionStatus } from '@prisma/client';
import { AdminWhatsappService } from 'src/admin/whatsapp/admin-whatsapp.service';

describe('AdminWhatsappService', () => {
  const uazapiClient: any = {};
  const instanceRepository: any = {};
  const snapshotService: any = {};

  const prisma: any = {
    whatsappCompanyConnection: {
      findMany: jest.fn(),
    },
  };

  let service: AdminWhatsappService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminWhatsappService(
      uazapiClient,
      prisma,
      instanceRepository,
      snapshotService,
    );
  });

  it('lists a disconnected company from the snapshot after its instance was deleted', async () => {
    const disconnectedAt = new Date('2026-08-10T12:00:00.000Z');
    prisma.whatsappCompanyConnection.findMany.mockResolvedValue([
      {
        id: 'snapshot-1',
        companyId: 'company-1',
        company: {
          id: 'company-1',
          name: 'Lava Fácil',
          email: 'lava-facil@example.com',
          cnpj: '00000000000000',
          state: 'ACTIVE',
        },
        instanceToken: null,
        instanceName: 'lava-facil',
        systemName: 'LavPerform',
        status: WhatsappCompanyConnectionStatus.absent,
        lastDisconnectedAt: disconnectedAt,
        lastConnectedAt: null,
        lastReconciledAt: new Date('2026-08-11T01:00:00.000Z'),
        updatedAt: new Date('2026-08-11T01:00:00.000Z'),
      },
    ]);

    const result = await service.listDisconnectedConnections();

    expect(result).toEqual([
      expect.objectContaining({
        companyId: 'company-1',
        instanceToken: null,
        status: WhatsappCompanyConnectionStatus.absent,
        lastDisconnectedAt: disconnectedAt,
        existsOnUazapi: false,
      }),
    ]);
  });
});
