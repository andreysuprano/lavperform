import { WhatsappInstanceStatus } from '@prisma/client';
import { ConnectionUpdateListener } from 'src/whatsapp/listeners/connection-update.listener';

describe('ConnectionUpdateListener', () => {
  const prisma: any = {
    whatsappInstance: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const aiAgentService: any = {
    ensureActiveAgentWebhook: jest.fn(),
  };

  const uazapiClient: any = {
    getConnectionState: jest.fn(),
  };

  const snapshotService: any = {
    upsertFromEvent: jest.fn(),
  };

  let listener: ConnectionUpdateListener;

  beforeEach(() => {
    jest.clearAllMocks();
    uazapiClient.getConnectionState = jest.fn().mockResolvedValue({
      instance: {},
      status: {},
    });
    snapshotService.upsertFromEvent = jest.fn().mockResolvedValue({});
    listener = new ConnectionUpdateListener(
      prisma,
      aiAgentService,
      uazapiClient,
      snapshotService,
    );
  });

  it('updates instance status by token and ensures agent webhook when connected', async () => {
    prisma.whatsappInstance.findFirst = jest.fn().mockResolvedValue({
      id: 'inst1',
      companyId: 'company1',
      token: 'tok-1',
      name: 'inst',
      phoneNumber: null,
    });
    prisma.whatsappInstance.update = jest.fn().mockResolvedValue({});

    await listener.handleConnectionUpdate({
      instance: 'inst',
      token: 'tok-1',
      status: 'CONNECTED',
      date: '',
    });

    expect(prisma.whatsappInstance.findFirst).toHaveBeenCalledWith({
      where: { token: 'tok-1' },
    });
    expect(prisma.whatsappInstance.update).toHaveBeenCalledWith({
      where: { id: 'inst1' },
      data: { status: WhatsappInstanceStatus.CONNECTED },
    });
    expect(snapshotService.upsertFromEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company1',
        instanceToken: 'tok-1',
        status: 'connected',
      }),
    );
    expect(aiAgentService.ensureActiveAgentWebhook).toHaveBeenCalledWith('company1');
  });

  it('falls back to name lookup when token is missing', async () => {
    prisma.whatsappInstance.findFirst = jest.fn().mockResolvedValue({
      id: 'inst1',
      companyId: 'company1',
      token: 'tok',
      name: 'inst',
      phoneNumber: null,
    });
    prisma.whatsappInstance.update = jest.fn().mockResolvedValue({});

    await listener.handleConnectionUpdate({
      instance: 'inst',
      status: 'DISCONNECTED',
      date: '2026-08-10T12:00:00.000Z',
    });

    expect(prisma.whatsappInstance.findFirst).toHaveBeenCalledWith({
      where: { name: 'inst' },
    });
    expect(snapshotService.upsertFromEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'disconnected',
        touchDisconnectedAt: true,
      }),
    );
    expect(aiAgentService.ensureActiveAgentWebhook).not.toHaveBeenCalled();
  });

  it('does not fall back to a duplicate name when a token was provided', async () => {
    prisma.whatsappInstance.findFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'wrong-instance',
        companyId: 'wrong-company',
        token: 'another-token',
        name: 'duplicate-name',
      });

    await listener.handleConnectionUpdate({
      instance: 'duplicate-name',
      token: 'unknown-token',
      status: 'DISCONNECTED',
      date: '',
    });

    expect(prisma.whatsappInstance.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.whatsappInstance.findFirst).toHaveBeenCalledWith({
      where: { token: 'unknown-token' },
    });
    expect(prisma.whatsappInstance.update).not.toHaveBeenCalled();
    expect(snapshotService.upsertFromEvent).not.toHaveBeenCalled();
  });

  it('does not ensure webhook when disconnected', async () => {
    prisma.whatsappInstance.findFirst = jest.fn().mockResolvedValue({
      id: 'inst1',
      companyId: 'company1',
      token: 'tok',
      name: 'inst',
      phoneNumber: null,
    });
    prisma.whatsappInstance.update = jest.fn().mockResolvedValue({});

    await listener.handleConnectionUpdate({
      instance: 'inst',
      token: 'tok',
      status: 'DISCONNECTED',
      date: '',
    });

    expect(aiAgentService.ensureActiveAgentWebhook).not.toHaveBeenCalled();
  });

  it('persists the connected phone number reported by uazapi', async () => {
    prisma.whatsappInstance.findFirst = jest.fn().mockResolvedValue({
      id: 'inst1',
      companyId: 'company1',
      token: 'tok',
      name: 'inst',
      phoneNumber: null,
    });
    prisma.whatsappInstance.update = jest.fn().mockResolvedValue({});
    uazapiClient.getConnectionState = jest.fn().mockResolvedValue({
      instance: {},
      status: { jid: '5511999990000@s.whatsapp.net' },
    });

    await listener.handleConnectionUpdate({
      instance: 'inst',
      token: 'tok',
      status: 'CONNECTED',
      date: '',
    });

    expect(uazapiClient.getConnectionState).toHaveBeenCalledWith('tok');
    expect(prisma.whatsappInstance.update).toHaveBeenCalledWith({
      where: { id: 'inst1' },
      data: { phoneNumber: '5511999990000' },
    });
  });

  it('keeps the stored number when uazapi reports no number', async () => {
    prisma.whatsappInstance.findFirst = jest.fn().mockResolvedValue({
      id: 'inst1',
      companyId: 'company1',
      token: 'tok',
      name: 'inst',
      phoneNumber: '5511999990000',
    });
    prisma.whatsappInstance.update = jest.fn().mockResolvedValue({});

    await listener.handleConnectionUpdate({
      instance: 'inst',
      token: 'tok',
      status: 'CONNECTED',
      date: '',
    });

    expect(prisma.whatsappInstance.update).toHaveBeenCalledTimes(1);
    expect(prisma.whatsappInstance.update).toHaveBeenCalledWith({
      where: { id: 'inst1' },
      data: { status: WhatsappInstanceStatus.CONNECTED },
    });
  });

  it('still updates the status when uazapi fails to report the number', async () => {
    prisma.whatsappInstance.findFirst = jest.fn().mockResolvedValue({
      id: 'inst1',
      companyId: 'company1',
      token: 'tok',
      name: 'inst',
      phoneNumber: null,
    });
    prisma.whatsappInstance.update = jest.fn().mockResolvedValue({});
    uazapiClient.getConnectionState = jest
      .fn()
      .mockRejectedValue(new Error('uazapi down'));

    await listener.handleConnectionUpdate({
      instance: 'inst',
      token: 'tok',
      status: 'CONNECTED',
      date: '',
    });

    expect(prisma.whatsappInstance.update).toHaveBeenCalledWith({
      where: { id: 'inst1' },
      data: { status: WhatsappInstanceStatus.CONNECTED },
    });
    expect(aiAgentService.ensureActiveAgentWebhook).toHaveBeenCalledWith('company1');
  });

  it('does not look up the number when disconnected', async () => {
    prisma.whatsappInstance.findFirst = jest.fn().mockResolvedValue({
      id: 'inst1',
      companyId: 'company1',
      token: 'tok',
      name: 'inst',
      phoneNumber: '5511999990000',
    });
    prisma.whatsappInstance.update = jest.fn().mockResolvedValue({});

    await listener.handleConnectionUpdate({
      instance: 'inst',
      token: 'tok',
      status: 'DISCONNECTED',
      date: '',
    });

    expect(uazapiClient.getConnectionState).not.toHaveBeenCalled();
    expect(prisma.whatsappInstance.update).toHaveBeenCalledTimes(1);
  });

  it('no-ops when instance missing', async () => {
    prisma.whatsappInstance.findFirst = jest.fn().mockResolvedValue(null);

    await listener.handleConnectionUpdate({
      instance: 'missing',
      token: 'unknown',
      status: 'DISCONNECTED',
      date: '',
    });

    expect(prisma.whatsappInstance.update).not.toHaveBeenCalled();
    expect(snapshotService.upsertFromEvent).not.toHaveBeenCalled();
    expect(aiAgentService.ensureActiveAgentWebhook).not.toHaveBeenCalled();
  });
});
