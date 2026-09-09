import { WhatsappWebhookController } from 'src/whatsapp/presentation/webhook.controller';

describe('WhatsappWebhookController', () => {
  const eventEmitter: any = {
    emit: jest.fn(),
  };

  const response: any = {
    status: jest.fn(),
    send: jest.fn(),
  };

  let controller: WhatsappWebhookController;

  beforeEach(() => {
    jest.clearAllMocks();
    response.status.mockReturnValue(response);
    response.send.mockReturnValue(response);
    controller = new WhatsappWebhookController(eventEmitter);
  });

  it.each(['connecting', 'pending'])(
    'does not emit a disconnect event for %s status',
    async (status) => {
      await controller.handleWebhook(
        {
          BaseUrl: 'https://example.uazapi.com',
          EventType: 'connection',
          instanceName: 'test-instance',
          owner: '',
          token: 'tok-123',
          instance: {
            name: 'test-instance',
            status,
            qrcode: '',
          },
        },
        response,
      );

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    },
  );
});
