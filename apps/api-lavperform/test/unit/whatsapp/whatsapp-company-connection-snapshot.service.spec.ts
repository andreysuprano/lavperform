import { WhatsappCompanyConnectionStatus } from '@prisma/client';
import { WhatsappCompanyConnectionSnapshotService } from 'src/whatsapp/application/whatsapp-company-connection-snapshot.service';

describe('WhatsappCompanyConnectionSnapshotService', () => {
  const prisma: any = {
    whatsappCompanyConnection: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  let service: WhatsappCompanyConnectionSnapshotService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WhatsappCompanyConnectionSnapshotService(prisma);
  });

  it('creates snapshot on first disconnect with lastDisconnectedAt', async () => {
    prisma.whatsappCompanyConnection.findUnique.mockResolvedValue(null);
    prisma.whatsappCompanyConnection.create.mockResolvedValue({});

    const eventAt = new Date('2026-08-10T12:00:00.000Z');
    await service.upsertFromEvent({
      companyId: 'c1',
      instanceToken: 'tok',
      instanceName: 'lava-facil',
      status: 'disconnected',
      eventAt,
      touchDisconnectedAt: true,
    });

    expect(prisma.whatsappCompanyConnection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: 'c1',
        status: WhatsappCompanyConnectionStatus.disconnected,
        lastDisconnectedAt: eventAt,
        instanceToken: 'tok',
      }),
    });
  });

  it('preserves lastDisconnectedAt when marking absent', async () => {
    const previous = new Date('2026-08-10T12:00:00.000Z');
    prisma.whatsappCompanyConnection.findUnique.mockResolvedValue({
      companyId: 'c1',
      status: WhatsappCompanyConnectionStatus.disconnected,
      lastDisconnectedAt: previous,
    });
    prisma.whatsappCompanyConnection.update.mockResolvedValue({});

    await service.markAbsent('c1');

    expect(prisma.whatsappCompanyConnection.update).toHaveBeenCalledWith({
      where: { companyId: 'c1' },
      data: expect.objectContaining({
        status: WhatsappCompanyConnectionStatus.absent,
        instanceToken: null,
      }),
    });

    const updateData = prisma.whatsappCompanyConnection.update.mock.calls[0][0].data;
    expect(updateData.lastDisconnectedAt).toBeUndefined();
  });
});
