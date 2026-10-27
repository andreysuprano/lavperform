import { MessageType } from '../types/incoming-message.types';
import { ReceiveWebhookUseCase } from './receive-webhook.use-case';

describe('ReceiveWebhookUseCase', () => {
  function build(overrides?: {
    findById?: jest.Mock;
    parse?: jest.Mock;
    maybeSend?: jest.Mock;
  }) {
    const repository = {
      save: jest.fn().mockResolvedValue({ id: 'evt-1' }),
    };
    const queue = {
      enqueue: jest.fn().mockResolvedValue('job-direct'),
    };
    const messageBuffer = {
      addToBuffer: jest.fn().mockResolvedValue('job-buffer'),
    };
    const agents = {
      findById: overrides?.findById ?? jest.fn().mockResolvedValue(null),
    };
    const provider = {
      parse: overrides?.parse ?? jest.fn(),
    };
    const waitingAck = {
      maybeSend: overrides?.maybeSend ?? jest.fn(),
    };
    const useCase = new ReceiveWebhookUseCase(
      repository as never,
      queue as never,
      messageBuffer as never,
      agents as never,
      provider as never,
      waitingAck as never,
    );
    return { useCase, queue, messageBuffer, agents, waitingAck };
  }

  it('enfileira texto enviado pela API sem colocar no buffer', async () => {
    const { useCase, queue, messageBuffer } = build();

    const result = await useCase.execute(
      payload({ type: 'text', wasSentByApi: true, fromMe: true, text: 'Um momento.' }),
      'company-1',
      'agent-1',
    );

    expect(messageBuffer.addToBuffer).not.toHaveBeenCalled();
    expect(queue.enqueue).toHaveBeenCalledWith('evt-1', 'agent-1');
    expect(result).toEqual({ jobId: 'job-direct', webhookEventId: 'evt-1' });
  });

  it('enfileira o texto digitado no aparelho humano sem colocar no buffer', async () => {
    const { useCase, queue, messageBuffer } = build();

    const result = await useCase.execute(
      payload({ type: 'text', wasSentByApi: false, fromMe: true, text: '#ia' }),
      'company-1',
      'agent-1',
    );

    expect(messageBuffer.addToBuffer).not.toHaveBeenCalled();
    expect(queue.enqueue).toHaveBeenCalledWith('evt-1', 'agent-1');
    expect(result).toEqual({ jobId: 'job-direct', webhookEventId: 'evt-1' });
  });

  it('coloca no buffer o texto do cliente', async () => {
    const { useCase, queue, messageBuffer } = build();

    await useCase.execute(
      payload({ type: 'text', wasSentByApi: false, fromMe: false, text: 'oi' }),
      'company-1',
      'agent-1',
    );

    expect(queue.enqueue).not.toHaveBeenCalled();
    expect(messageBuffer.addToBuffer).toHaveBeenCalledWith('evt-1', 'agent-1', 'chat-1');
  });

  it('coloca no buffer o texto do cliente mesmo se a saudação não resolver', async () => {
    const maybeSend = jest.fn().mockReturnValue(new Promise(() => {}));
    const { useCase, messageBuffer } = build({
      findById: jest.fn().mockResolvedValue({ id: 'agent-1' }),
      parse: jest.fn().mockReturnValue({
        type: MessageType.TEXT,
        isFromMe: false,
        wasSentByApi: false,
        text: 'oi',
      }),
      maybeSend,
    });

    const result = await useCase.execute(
      payload({ type: 'text', wasSentByApi: false, fromMe: false, text: 'oi' }),
      'company-1',
      'agent-1',
    );

    expect(maybeSend).toHaveBeenCalled();
    expect(messageBuffer.addToBuffer).toHaveBeenCalledWith('evt-1', 'agent-1', 'chat-1');
    expect(result).toEqual({ jobId: 'job-buffer', webhookEventId: 'evt-1' });
  });

  it('enfileira imagem mesmo se a saudação não resolver em 5s', async () => {
    jest.useFakeTimers();
    try {
      const maybeSend = jest.fn().mockReturnValue(new Promise(() => {}));
      const { useCase, queue, messageBuffer } = build({
        findById: jest.fn().mockResolvedValue({ id: 'agent-1' }),
        parse: jest.fn().mockReturnValue({
          type: MessageType.IMAGE,
          isFromMe: false,
          wasSentByApi: false,
          mediaUrl: 'https://example.test/img.jpg',
          mimeType: 'image/jpeg',
        }),
        maybeSend,
      });

      const pending = useCase.execute(
        JSON.stringify({
          message: {
            type: 'media',
            mediaType: 'image',
            wasSentByApi: false,
            fromMe: false,
            chatid: 'chat-1',
          },
        }),
        'company-1',
        'agent-1',
      );

      await jest.advanceTimersByTimeAsync(5000);

      await expect(pending).resolves.toEqual({
        jobId: 'job-direct',
        webhookEventId: 'evt-1',
      });
      expect(maybeSend).toHaveBeenCalled();
      expect(queue.enqueue).toHaveBeenCalledWith('evt-1', 'agent-1');
      expect(messageBuffer.addToBuffer).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});

function payload(message: {
  type: string;
  wasSentByApi: boolean;
  fromMe: boolean;
  text: string;
}): string {
  return JSON.stringify({
    message: {
      ...message,
      chatid: 'chat-1',
    },
  });
}
