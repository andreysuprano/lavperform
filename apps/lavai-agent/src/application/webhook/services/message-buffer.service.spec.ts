const mockRedis = {
  rpush: jest.fn(),
  expire: jest.fn(),
  llen: jest.fn(),
  del: jest.fn(),
  quit: jest.fn(),
};

jest.mock('ioredis', () => jest.fn().mockImplementation(() => mockRedis));

import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { BUFFER_JOB_NAME, MessageBufferService } from './message-buffer.service';

const AGENT_ID = 'agent-1';
const CHAT_ID = 'chat-1';
const BUFFER_KEY = `msg-buffer:${AGENT_ID}:${CHAT_ID}`;
const JOB_ID = `buffer:${AGENT_ID}:${CHAT_ID}`;

function createService() {
  const existingJob = { remove: jest.fn().mockResolvedValue(undefined) };
  const queue = {
    getJob: jest.fn().mockResolvedValue(existingJob),
    add: jest.fn().mockResolvedValue({ id: JOB_ID }),
  };
  const config = {
    get: jest.fn((_key: string, fallback?: number) => fallback),
    getOrThrow: jest.fn().mockReturnValue('redis://localhost:6379'),
  };
  const service = new MessageBufferService(
    queue as unknown as Queue,
    config as unknown as ConfigService,
  );
  service.onModuleInit();
  return { service, queue, existingJob };
}

describe('MessageBufferService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.rpush.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.llen.mockResolvedValue(0);
    mockRedis.del.mockResolvedValue(1);
  });

  describe('addToBuffer', () => {
    it('usa delay 3000 quando delayOverrideMs está ausente', async () => {
      const { service, queue } = createService();

      await service.addToBuffer('evt-1', AGENT_ID, CHAT_ID);

      expect(queue.add).toHaveBeenCalledWith(
        BUFFER_JOB_NAME,
        { agentId: AGENT_ID, chatId: CHAT_ID, bufferKey: BUFFER_KEY },
        expect.objectContaining({ jobId: JOB_ID, delay: 3000 }),
      );
    });

    it('usa delay 45000 quando delayOverrideMs é 45000', async () => {
      const { service, queue } = createService();

      await service.addToBuffer('evt-1', AGENT_ID, CHAT_ID, 45000);

      expect(queue.add).toHaveBeenCalledWith(
        BUFFER_JOB_NAME,
        { agentId: AGENT_ID, chatId: CHAT_ID, bufferKey: BUFFER_KEY },
        expect.objectContaining({ jobId: JOB_ID, delay: 45000 }),
      );
    });
  });

  describe('hasItems', () => {
    it('é true quando llen é 2', async () => {
      mockRedis.llen.mockResolvedValue(2);
      const { service } = createService();

      await expect(service.hasItems(AGENT_ID, CHAT_ID)).resolves.toBe(true);
      expect(mockRedis.llen).toHaveBeenCalledWith(BUFFER_KEY);
    });
  });

  describe('reschedule', () => {
    it('remove o job existente e adiciona process-buffer com o delay novo, sem del na lista', async () => {
      const { service, queue, existingJob } = createService();

      await service.reschedule(AGENT_ID, CHAT_ID, 45000);

      expect(existingJob.remove).toHaveBeenCalled();
      expect(queue.add).toHaveBeenCalledWith(
        BUFFER_JOB_NAME,
        { agentId: AGENT_ID, chatId: CHAT_ID, bufferKey: BUFFER_KEY },
        expect.objectContaining({ jobId: JOB_ID, delay: 45000 }),
      );
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('discard', () => {
    it('faz del da lista e remove do job', async () => {
      const { service, existingJob } = createService();

      await service.discard(AGENT_ID, CHAT_ID);

      expect(mockRedis.del).toHaveBeenCalledWith(BUFFER_KEY);
      expect(existingJob.remove).toHaveBeenCalled();
    });
  });
});
