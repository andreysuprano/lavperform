import { IdleCloseSchedulerService } from './idle-close-scheduler.service';

describe('IdleCloseSchedulerService', () => {
  const queue = {
    getJob: jest.fn(),
    add: jest.fn(),
  };

  const service = new IdleCloseSchedulerService(queue as never);

  const input = {
    conversationId: 'conv-1',
    agentId: 'agent-1',
    anchorMessageId: 'anchor-1',
    delayMs: 3_600_000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queue.add.mockResolvedValue(undefined);
  });

  it('remove o job anterior e agenda close-if-idle com atraso e retentativa', async () => {
    const existing = { remove: jest.fn().mockResolvedValue(undefined) };
    queue.getJob.mockResolvedValue(existing);

    await service.schedule(input);

    expect(queue.getJob).toHaveBeenCalledWith('idle-close:conv-1');
    expect(existing.remove).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(
      'close-if-idle',
      {
        conversationId: 'conv-1',
        agentId: 'agent-1',
        anchorMessageId: 'anchor-1',
      },
      expect.objectContaining({
        jobId: 'idle-close:conv-1',
        delay: 3_600_000,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }),
    );
    expect(existing.remove.mock.invocationCallOrder[0]).toBeLessThan(
      queue.add.mock.invocationCallOrder[0],
    );
  });

  it('agenda quando ainda não existe job para a conversa', async () => {
    queue.getJob.mockResolvedValue(null);

    await service.schedule(input);

    expect(queue.getJob).toHaveBeenCalledWith('idle-close:conv-1');
    expect(queue.add).toHaveBeenCalledWith(
      'close-if-idle',
      {
        conversationId: 'conv-1',
        agentId: 'agent-1',
        anchorMessageId: 'anchor-1',
      },
      expect.objectContaining({
        jobId: 'idle-close:conv-1',
        delay: 3_600_000,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }),
    );
  });

  it('cancel remove o job e não agenda outro', async () => {
    const existing = { remove: jest.fn().mockResolvedValue(undefined) };
    queue.getJob.mockResolvedValue(existing);

    await service.cancel('conv-1');

    expect(queue.getJob).toHaveBeenCalledWith('idle-close:conv-1');
    expect(existing.remove).toHaveBeenCalledTimes(1);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('cancel sem job pendente não falha', async () => {
    queue.getJob.mockResolvedValue(null);

    await expect(service.cancel('conv-1')).resolves.toBeUndefined();

    expect(queue.add).not.toHaveBeenCalled();
  });

  it('cancelChat cancela o prazo de cada conversa do agente e do chat', async () => {
    const conversations = {
      findByAgentAndChat: jest.fn().mockResolvedValue([{ id: 'conv-1' }, { id: 'conv-2' }]),
    };
    const scoped = new IdleCloseSchedulerService(queue as never, conversations as never);
    const remove = jest.fn().mockResolvedValue(undefined);
    queue.getJob.mockResolvedValue({ remove });

    await scoped.cancelChat('agent-1', 'chat-1');

    expect(conversations.findByAgentAndChat).toHaveBeenCalledWith('agent-1', 'chat-1');
    expect(queue.getJob).toHaveBeenCalledWith('idle-close:conv-1');
    expect(queue.getJob).toHaveBeenCalledWith('idle-close:conv-2');
    expect(remove).toHaveBeenCalledTimes(2);
    expect(queue.add).not.toHaveBeenCalled();
  });
});
