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
    company: {
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
    prisma.company.findMany.mockResolvedValue([]);

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

  it('lists active companies that never created a WhatsApp instance as disconnected', async () => {
    prisma.whatsappCompanyConnection.findMany.mockResolvedValue([]);
    prisma.company.findMany.mockResolvedValue([
      {
        id: 'acqua-salvador',
        name: 'Acqua Express Salvador-BA',
        email: 'Guermandic@gmail.com',
        cnpj: '00000000000000',
        state: 'ACTIVE',
      },
    ]);

    const result = await service.listDisconnectedConnections();

    expect(prisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          state: 'ACTIVE',
        }),
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({
        companyId: 'acqua-salvador',
        instanceToken: null,
        instanceName: null,
        status: WhatsappCompanyConnectionStatus.disconnected,
        lastDisconnectedAt: null,
        existsOnUazapi: false,
        neverCreated: true,
      }),
    ]);
  });
});
