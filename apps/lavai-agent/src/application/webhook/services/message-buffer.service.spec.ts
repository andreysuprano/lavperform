const mockRedis = {
  rpush: jest.fn(),
  expire: jest.fn(),
  exists: jest.fn(),
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
  const existingJob = {
    remove: jest.fn().mockResolvedValue(undefined),
    getState: jest.fn().mockResolvedValue('delayed'),
  };
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
    mockRedis.exists.mockResolvedValue(0);
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
    it('renova o TTL da lista quando a chave existe', async () => {
      mockRedis.exists.mockResolvedValue(1);
      const { service } = createService();

      await service.reschedule(AGENT_ID, CHAT_ID, 45000);

      expect(mockRedis.exists).toHaveBeenCalledWith(BUFFER_KEY);
      expect(mockRedis.expire).toHaveBeenCalledWith(BUFFER_KEY, 45 + 120);
    });

    it('não chama expire quando a lista não existe', async () => {
      mockRedis.exists.mockResolvedValue(0);
      const { service } = createService();

      await service.reschedule(AGENT_ID, CHAT_ID, 45000);

      expect(mockRedis.expire).not.toHaveBeenCalled();
    });

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

    it('usa o jobId de hold e não remove o job canônico quando ele está ativo', async () => {
      const { service, queue } = createService();
      const activeJob = {
        remove: jest.fn().mockRejectedValue(new Error('locked')),
        getState: jest.fn().mockResolvedValue('active'),
      };
      queue.getJob.mockImplementation(async (id: string) =>
        id === JOB_ID ? activeJob : undefined,
      );

      await service.reschedule(AGENT_ID, CHAT_ID, 45000);

      expect(activeJob.remove).not.toHaveBeenCalled();
      expect(queue.add).toHaveBeenCalledWith(
        BUFFER_JOB_NAME,
        { agentId: AGENT_ID, chatId: CHAT_ID, bufferKey: BUFFER_KEY },
        expect.objectContaining({ jobId: `${JOB_ID}:hold`, delay: 45000 }),
      );
    });
  });

  describe('discard', () => {
    it('faz del da lista e remove os jobs canônico e de hold', async () => {
      const { service, queue, existingJob } = createService();

      await service.discard(AGENT_ID, CHAT_ID);

      expect(mockRedis.del).toHaveBeenCalledWith(BUFFER_KEY);
      expect(queue.getJob).toHaveBeenCalledWith(JOB_ID);
      expect(queue.getJob).toHaveBeenCalledWith(`${JOB_ID}:hold`);
      expect(existingJob.remove).toHaveBeenCalledTimes(2);
    });
  });
});
