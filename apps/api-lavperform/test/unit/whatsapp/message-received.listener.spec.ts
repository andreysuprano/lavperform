import { MessageReceivedListener } from 'src/whatsapp/listeners/message-received.listener';

describe('MessageReceivedListener', () => {
  const prisma: any = {};
  let listener: MessageReceivedListener;

  beforeEach(() => {
    listener = new MessageReceivedListener(prisma);
  });

  it('logs receipt without throwing', async () => {
    const payload = {
      key: { remoteJid: '5511999999999@wa', fromMe: false, id: '1' },
      message: { conversation: 'hello' },
      messageTimestamp: Date.now(),
      status: 'RECEIVED',
    };

    await expect(listener.handleMessageReceived(payload as any)).resolves.toBeUndefined();
  });
});
