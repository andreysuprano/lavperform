import { ReceiveWebhookUseCase } from './receive-webhook.use-case';

describe('ReceiveWebhookUseCase', () => {
  function build() {
    const repository = {
      save: jest.fn().mockResolvedValue({ id: 'evt-1' }),
    };
    const queue = {
      enqueue: jest.fn().mockResolvedValue('job-direct'),
    };
    const messageBuffer = {
      addToBuffer: jest.fn().mockResolvedValue('job-buffer'),
    };
    const useCase = new ReceiveWebhookUseCase(
      repository as never,
      queue as never,
      messageBuffer as never,
      { findById: jest.fn().mockResolvedValue(null) } as never,
      { parse: jest.fn() } as never,
      { maybeSend: jest.fn() } as never,
    );
    return { useCase, queue, messageBuffer };
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

  it('coloca no buffer o texto digitado no aparelho humano', async () => {
    const { useCase, queue, messageBuffer } = build();

    const result = await useCase.execute(
      payload({ type: 'text', wasSentByApi: false, fromMe: true, text: '#ia' }),
      'company-1',
      'agent-1',
    );

    expect(queue.enqueue).not.toHaveBeenCalled();
    expect(messageBuffer.addToBuffer).toHaveBeenCalledWith('evt-1', 'agent-1', 'chat-1');
    expect(result).toEqual({ jobId: 'job-buffer', webhookEventId: 'evt-1' });
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
