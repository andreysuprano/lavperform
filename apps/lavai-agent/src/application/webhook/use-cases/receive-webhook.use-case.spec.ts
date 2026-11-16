import { MessageType } from '../types/incoming-message.types';
import { ReceiveWebhookUseCase } from './receive-webhook.use-case';

describe('ReceiveWebhookUseCase', () => {
  function build(overrides?: {
    findById?: jest.Mock;
    parse?: jest.Mock;
    maybeSend?: jest.Mock;
    remainingMs?: jest.Mock;
    hasItems?: jest.Mock;
    getPending?: jest.Mock;
  }) {
    const repository = {
      save: jest.fn().mockResolvedValue({ id: 'evt-1' }),
    };
    const queue = {
      enqueue: jest.fn().mockResolvedValue('job-direct'),
    };
    const messageBuffer = {
      addToBuffer: jest.fn().mockResolvedValue('job-buffer'),
      hasItems: overrides?.hasItems ?? jest.fn().mockResolvedValue(false),
      reschedule: jest.fn().mockResolvedValue(undefined),
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
    const typing = {
      refresh: jest.fn().mockResolvedValue(undefined),
      remainingMs: overrides?.remainingMs ?? jest.fn().mockResolvedValue(0),
      getPending: overrides?.getPending ?? jest.fn().mockResolvedValue(null),
      pauseMs: 120000,
    };
    const useCase = new ReceiveWebhookUseCase(
      repository as never,
      queue as never,
      messageBuffer as never,
      agents as never,
      provider as never,
      waitingAck as never,
      typing as never,
    );
    return { useCase, repository, queue, messageBuffer, agents, waitingAck, typing };
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
    expect(result).toEqual({ kind: 'queued', jobId: 'job-direct', webhookEventId: 'evt-1' });
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
    expect(result).toEqual({ kind: 'queued', jobId: 'job-direct', webhookEventId: 'evt-1' });
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
    expect(result).toEqual({ kind: 'queued', jobId: 'job-buffer', webhookEventId: 'evt-1' });
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
        kind: 'queued',
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

  it('pausa o chat na presença composing do atendente sem persistir o evento', async () => {
    const { useCase, repository, typing } = build();

    const result = await useCase.execute(
      presencePayload({ IsFromMe: true, State: 'composing', chatid: 'chat-1' }),
      'company-1',
      'agent-1',
    );

    expect(repository.save).not.toHaveBeenCalled();
    expect(typing.refresh).toHaveBeenCalledWith('agent-1', 'chat-1');
    expect(result).toEqual({ kind: 'presence' });
  });

  it('aceita presença do cliente sem pausar nem persistir', async () => {
    const { useCase, repository, typing } = build();

    const result = await useCase.execute(
      presencePayload({ IsFromMe: false, State: 'composing', chatid: 'chat-1' }),
      'company-1',
      'agent-1',
    );

    expect(repository.save).not.toHaveBeenCalled();
    expect(typing.refresh).not.toHaveBeenCalled();
    expect(result).toEqual({ kind: 'presence' });
  });

  it('não pausa presença paused com mídia de áudio', async () => {
    const { useCase, typing } = build();

    await useCase.execute(
      presencePayload({
        IsFromMe: true,
        State: 'paused',
        Media: 'audio',
        chatid: 'chat-1',
      }),
      'company-1',
      'agent-1',
    );

    expect(typing.refresh).not.toHaveBeenCalled();
  });

  it('reagenda o buffer quando há itens na lista após composing', async () => {
    const { useCase, messageBuffer, typing } = build({
      hasItems: jest.fn().mockResolvedValue(true),
    });

    await useCase.execute(
      presencePayload({ IsFromMe: true, State: 'composing', chatid: 'chat-1' }),
      'company-1',
      'agent-1',
    );

    expect(messageBuffer.reschedule).toHaveBeenCalledWith('agent-1', 'chat-1', typing.pauseMs);
  });

  it('não reagenda o buffer quando a lista está vazia e não há retomada pendente', async () => {
    const { useCase, messageBuffer } = build({
      hasItems: jest.fn().mockResolvedValue(false),
      getPending: jest.fn().mockResolvedValue(null),
    });

    await useCase.execute(
      presencePayload({ IsFromMe: true, State: 'composing', chatid: 'chat-1' }),
      'company-1',
      'agent-1',
    );

    expect(messageBuffer.reschedule).not.toHaveBeenCalled();
  });

  it('usa o TTL restante da pausa ao colocar texto do cliente no buffer', async () => {
    const { useCase, messageBuffer } = build({
      remainingMs: jest.fn().mockResolvedValue(45000),
    });

    await useCase.execute(
      payload({ type: 'text', wasSentByApi: false, fromMe: false, text: 'oi' }),
      'company-1',
      'agent-1',
    );

    expect(messageBuffer.addToBuffer).toHaveBeenCalledWith('evt-1', 'agent-1', 'chat-1', 45000);
  });

  it('não sobrescreve o delay do buffer quando não há pausa restante', async () => {
    const { useCase, messageBuffer } = build({
      remainingMs: jest.fn().mockResolvedValue(0),
    });

    await useCase.execute(
      payload({ type: 'text', wasSentByApi: false, fromMe: false, text: 'oi' }),
      'company-1',
      'agent-1',
    );

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

function presencePayload(event: {
  IsFromMe: boolean;
  State?: string;
  Media?: string;
  chatid?: string;
}): string {
  return JSON.stringify({
    EventType: 'presence',
    event,
  });
}
