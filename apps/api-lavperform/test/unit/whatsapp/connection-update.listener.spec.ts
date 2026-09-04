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

  let listener: ConnectionUpdateListener;

  beforeEach(() => {
    jest.clearAllMocks();
    uazapiClient.getConnectionState = jest.fn().mockResolvedValue({
      instance: {},
      status: {},
    });
    listener = new ConnectionUpdateListener(prisma, aiAgentService, uazapiClient);
  });

  it('updates instance status and ensures agent webhook when connected', async () => {
    prisma.whatsappInstance.findFirst = jest.fn().mockResolvedValue({
      id: 'inst1',
      companyId: 'company1',
    });
    prisma.whatsappInstance.update = jest.fn().mockResolvedValue({});

    await listener.handleConnectionUpdate({ instance: 'inst', status: 'CONNECTED', date: '' });

    expect(prisma.whatsappInstance.update).toHaveBeenCalledWith({
      where: { id: 'inst1' },
      data: { status: WhatsappInstanceStatus.CONNECTED },
    });
    expect(aiAgentService.ensureActiveAgentWebhook).toHaveBeenCalledWith('company1');
  });

  it('does not ensure webhook when disconnected', async () => {
    prisma.whatsappInstance.findFirst = jest.fn().mockResolvedValue({
      id: 'inst1',
      companyId: 'company1',
    });
    prisma.whatsappInstance.update = jest.fn().mockResolvedValue({});

    await listener.handleConnectionUpdate({
      instance: 'inst',
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
      phoneNumber: null,
    });
    prisma.whatsappInstance.update = jest.fn().mockResolvedValue({});
    uazapiClient.getConnectionState = jest.fn().mockResolvedValue({
      instance: {},
      status: { jid: '5511999990000@s.whatsapp.net' },
    });

    await listener.handleConnectionUpdate({ instance: 'inst', status: 'CONNECTED', date: '' });

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
      phoneNumber: '5511999990000',
    });
    prisma.whatsappInstance.update = jest.fn().mockResolvedValue({});

    await listener.handleConnectionUpdate({ instance: 'inst', status: 'CONNECTED', date: '' });

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
      phoneNumber: null,
    });
    prisma.whatsappInstance.update = jest.fn().mockResolvedValue({});
    uazapiClient.getConnectionState = jest
      .fn()
      .mockRejectedValue(new Error('uazapi down'));

    await listener.handleConnectionUpdate({ instance: 'inst', status: 'CONNECTED', date: '' });

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
      phoneNumber: '5511999990000',
    });
    prisma.whatsappInstance.update = jest.fn().mockResolvedValue({});

    await listener.handleConnectionUpdate({
      instance: 'inst',
      status: 'DISCONNECTED',
      date: '',
    });

    expect(uazapiClient.getConnectionState).not.toHaveBeenCalled();
    expect(prisma.whatsappInstance.update).toHaveBeenCalledTimes(1);
  });

  it('no-ops when instance missing', async () => {
    prisma.whatsappInstance.findFirst = jest.fn().mockResolvedValue(null);

    await listener.handleConnectionUpdate({ instance: 'missing', status: 'DISCONNECTED', date: '' });

    expect(prisma.whatsappInstance.update).not.toHaveBeenCalled();
    expect(aiAgentService.ensureActiveAgentWebhook).not.toHaveBeenCalled();
  });
});
