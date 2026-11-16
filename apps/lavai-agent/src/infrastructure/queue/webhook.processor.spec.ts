import { WebhookProcessor } from './webhook.processor';
import { BUFFER_JOB_NAME } from '../../application/webhook/services/message-buffer.service';

describe('WebhookProcessor.processBuffer', () => {
  const processWebhookJob = { execute: jest.fn(), executeBatch: jest.fn() };
  const messageBuffer = {
    popBuffer: jest.fn(),
    hasItems: jest.fn(),
    reschedule: jest.fn(),
  };
  const typing = {
    isPaused: jest.fn(),
    remainingMs: jest.fn(),
    pauseMs: 120000,
    clearPending: jest.fn(),
    touchPending: jest.fn(),
  };
  const takeover = { isInTakeover: jest.fn() };
  const typingResume = { resume: jest.fn() };

  const processor = new WebhookProcessor(
    processWebhookJob as never,
    messageBuffer as never,
    typing as never,
    takeover as never,
    typingResume as never,
  );

  const job = {
    id: 'job-1',
    name: BUFFER_JOB_NAME,
    data: { agentId: 'agent-1', chatId: 'chat-1', bufferKey: 'msg-buffer:agent-1:chat-1' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    typing.isPaused.mockResolvedValue(false);
    typing.remainingMs.mockResolvedValue(0);
    takeover.isInTakeover.mockResolvedValue(false);
    messageBuffer.hasItems.mockResolvedValue(true);
    messageBuffer.popBuffer.mockResolvedValue(['evt-1', 'evt-2']);
    processWebhookJob.executeBatch.mockResolvedValue(undefined);
  });

  it('reagenda com o tempo restante, sem consumir o buffer, durante a pausa', async () => {
    typing.isPaused.mockResolvedValue(true);
    typing.remainingMs.mockResolvedValue(30000);

    await processor.process(job as never);

    expect(messageBuffer.reschedule).toHaveBeenCalledWith('agent-1', 'chat-1', 30000);
    expect(messageBuffer.popBuffer).not.toHaveBeenCalled();
    expect(processWebhookJob.executeBatch).not.toHaveBeenCalled();
  });

  it('usa o tempo cheio da pausa quando o restante é zero', async () => {
    typing.isPaused.mockResolvedValue(true);
    typing.remainingMs.mockResolvedValue(0);

    await processor.process(job as never);

    expect(messageBuffer.reschedule).toHaveBeenCalledWith('agent-1', 'chat-1', 120000);
  });

  it('descarta o buffer e apaga o marcador em takeover', async () => {
    takeover.isInTakeover.mockResolvedValue(true);

    await processor.process(job as never);

    expect(messageBuffer.popBuffer).toHaveBeenCalledWith(job.data.bufferKey);
    expect(typing.clearPending).toHaveBeenCalledWith('agent-1', 'chat-1');
    expect(processWebhookJob.executeBatch).not.toHaveBeenCalled();
  });

  it('processa o lote quando há itens', async () => {
    await processor.process(job as never);

    expect(messageBuffer.popBuffer).toHaveBeenCalledWith(job.data.bufferKey);
    expect(processWebhookJob.executeBatch).toHaveBeenCalledWith(['evt-1', 'evt-2'], 'agent-1');
    expect(typingResume.resume).not.toHaveBeenCalled();
  });

  it('renova o marcador e relança quando o lote falha', async () => {
    processWebhookJob.executeBatch.mockRejectedValue(new Error('boom'));

    await expect(processor.process(job as never)).rejects.toThrow('boom');

    expect(typing.touchPending).toHaveBeenCalledWith('agent-1', 'chat-1');
  });

  it('retoma a resposta retida quando o buffer está vazio', async () => {
    messageBuffer.hasItems.mockResolvedValue(false);

    await processor.process(job as never);

    expect(typingResume.resume).toHaveBeenCalledWith('agent-1', 'chat-1');
    expect(messageBuffer.popBuffer).not.toHaveBeenCalled();
    expect(processWebhookJob.executeBatch).not.toHaveBeenCalled();
  });
});
