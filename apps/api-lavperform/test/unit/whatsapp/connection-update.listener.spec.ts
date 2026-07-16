import { WhatsappInstanceStatus } from '@prisma/client';
import { ConnectionUpdateListener } from 'src/whatsapp/listeners/connection-update.listener';

describe('ConnectionUpdateListener', () => {
  const prisma: any = {
    whatsappInstance: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  let listener: ConnectionUpdateListener;

  beforeEach(() => {
    jest.clearAllMocks();
    listener = new ConnectionUpdateListener(prisma);
  });

  it('updates instance status when found', async () => {
    prisma.whatsappInstance.findFirst = jest.fn().mockResolvedValue({ id: 'inst1' });
    prisma.whatsappInstance.update = jest.fn().mockResolvedValue({});

    await listener.handleConnectionUpdate({ instance: 'inst', status: 'CONNECTED', date: '' });

    expect(prisma.whatsappInstance.update).toHaveBeenCalledWith({
      where: { id: 'inst1' },
      data: { status: WhatsappInstanceStatus.CONNECTED },
    });
  });

  it('no-ops when instance missing', async () => {
    prisma.whatsappInstance.findFirst = jest.fn().mockResolvedValue(null);

    await listener.handleConnectionUpdate({ instance: 'missing', status: 'DISCONNECTED', date: '' });

    expect(prisma.whatsappInstance.update).not.toHaveBeenCalled();
  });
});
