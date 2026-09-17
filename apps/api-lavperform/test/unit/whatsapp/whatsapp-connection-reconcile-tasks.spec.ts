import { WhatsappCompanyConnectionStatus } from '@prisma/client';
import { WhatsappCompanyConnectionSnapshotService } from 'src/whatsapp/application/whatsapp-company-connection-snapshot.service';
import { WhatsappConnectionReconcileTasks } from 'src/whatsapp/crons/whatsapp-connection-reconcile-tasks';

describe('WhatsappConnectionReconcileTasks', () => {
  const uazapiClient: any = {
    getAllInstances: jest.fn(),
  };

  const prisma: any = {
    whatsappInstance: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    whatsappCompanyConnection: {
      findMany: jest.fn(),
    },
  };

  const snapshotService: any = {
    upsertFromEvent: jest.fn(),
    markAbsent: jest.fn(),
  };

  let tasks: WhatsappConnectionReconcileTasks;

  beforeEach(() => {
    jest.clearAllMocks();
    tasks = new WhatsappConnectionReconcileTasks(
      uazapiClient,
      prisma,
      snapshotService,
    );
  });

  it('syncs status by token and updates snapshot', async () => {
    uazapiClient.getAllInstances.mockResolvedValue([
      {
        token: 'tok-1',
        name: 'loja',
        status: 'disconnected',
        lastDisconnect: '2026-08-10T10:00:00.000Z',
        updated: '2026-08-10T10:00:00.000Z',
        systemName: 'LavPerform',
      },
    ]);
    prisma.whatsappInstance.findMany.mockResolvedValue([
      {
        id: 'inst1',
        token: 'tok-1',
        name: 'loja',
        status: 'CONNECTED',
        companyId: 'company1',
      },
    ]);
    prisma.whatsappCompanyConnection.findMany.mockResolvedValue([]);
    prisma.whatsappInstance.update.mockResolvedValue({});
    snapshotService.upsertFromEvent.mockResolvedValue({});

    await tasks.reconcileConnections();

    expect(prisma.whatsappInstance.update).toHaveBeenCalledWith({
      where: { id: 'inst1' },
      data: { status: 'DISCONNECTED' },
    });
    expect(snapshotService.upsertFromEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company1',
        instanceToken: 'tok-1',
        status: WhatsappCompanyConnectionStatus.disconnected,
        touchDisconnectedAt: true,
      }),
    );
  });

  it('marks snapshot absent when token disappeared from UAZAPI', async () => {
    uazapiClient.getAllInstances.mockResolvedValue([]);
    prisma.whatsappInstance.findMany.mockResolvedValue([
      {
        id: 'inst1',
        token: 'tok-gone',
        name: 'lava-facil',
        status: 'CONNECTED',
        companyId: 'company1',
      },
    ]);
    prisma.whatsappCompanyConnection.findMany.mockResolvedValue([]);
    snapshotService.markAbsent.mockResolvedValue({});

    await expect(tasks.reconcileConnections()).resolves.toEqual({
      synced: 0,
      markedAbsent: 1,
      errors: 0,
    });

    expect(snapshotService.markAbsent).toHaveBeenCalledWith('company1');
    expect(prisma.whatsappInstance.update).toHaveBeenCalledWith({
      where: { id: 'inst1' },
      data: { status: 'DISCONNECTED' },
    });
    expect(snapshotService.upsertFromEvent).not.toHaveBeenCalled();
  });
});
