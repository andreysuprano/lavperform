const mockRedis = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  expire: jest.fn(),
  pttl: jest.fn(),
  exists: jest.fn(),
  quit: jest.fn(),
};

jest.mock('ioredis', () => jest.fn().mockImplementation(() => mockRedis));

import { ConfigService } from '@nestjs/config';
import { HumanTypingPauseService } from './human-typing-pause.service';

function createService(pauseMs: number | undefined = 120000): HumanTypingPauseService {
  const config = {
    get: jest.fn((_key: string, fallback?: number) =>
      pauseMs === undefined ? fallback : pauseMs,
    ),
    getOrThrow: jest.fn().mockReturnValue('redis://localhost:6379'),
  };
  const service = new HumanTypingPauseService(config as unknown as ConfigService);
  service.onModuleInit();
  return service;
}

describe('HumanTypingPauseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.get.mockResolvedValue(null);
    mockRedis.del.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.pttl.mockResolvedValue(-2);
    mockRedis.exists.mockResolvedValue(0);
    mockRedis.quit.mockResolvedValue('OK');
  });

  describe('shouldPauseForPresence', () => {
    const service = createService();

    it('pausa quando fromMe e composing', () => {
      expect(
        service.shouldPauseForPresence({ isFromMe: true, state: 'composing' }),
      ).toBe(true);
    });

    it('pausa quando fromMe e RECORDING', () => {
      expect(
        service.shouldPauseForPresence({ isFromMe: true, state: 'RECORDING' }),
      ).toBe(true);
    });

    it('pausa quando fromMe, media Audio e state vazio', () => {
      expect(
        service.shouldPauseForPresence({
          isFromMe: true,
          state: '',
          media: 'Audio',
        }),
      ).toBe(true);
    });

    it('não pausa quando fromMe, paused e media audio', () => {
      expect(
        service.shouldPauseForPresence({
          isFromMe: true,
          state: 'paused',
          media: 'audio',
        }),
      ).toBe(false);
    });

    it('não pausa quando isFromMe é false mesmo com composing', () => {
      expect(
        service.shouldPauseForPresence({ isFromMe: false, state: 'composing' }),
      ).toBe(false);
    });
  });

  describe('refresh', () => {
    it("faz set na chave human-typing com EX 120", async () => {
      const service = createService();
      await service.refresh('agent-1', 'chat-1');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'human-typing:agent-1:chat-1',
        '1',
        'EX',
        120,
      );
    });

    it('renova expire do pending quando getPending já tem valor', async () => {
      mockRedis.get.mockResolvedValue('conv-1');
      const service = createService();
      await service.refresh('agent-1', 'chat-1');

      expect(mockRedis.expire).toHaveBeenCalledWith(
        'human-typing-pending:agent-1:chat-1',
        900,
      );
    });

    it('não cria marcador pending quando não existe', async () => {
      mockRedis.get.mockResolvedValue(null);
      const service = createService();
      await service.refresh('agent-1', 'chat-1');

      expect(mockRedis.expire).not.toHaveBeenCalled();
    });
  });

  describe('remainingMs', () => {
    it('devolve o PTTL quando positivo', async () => {
      mockRedis.pttl.mockResolvedValue(45000);
      const service = createService();

      await expect(service.remainingMs('agent-1', 'chat-1')).resolves.toBe(45000);
      expect(mockRedis.pttl).toHaveBeenCalledWith('human-typing:agent-1:chat-1');
    });

    it('devolve 0 quando o PTTL é -2', async () => {
      mockRedis.pttl.mockResolvedValue(-2);
      const service = createService();

      await expect(service.remainingMs('agent-1', 'chat-1')).resolves.toBe(0);
    });
  });

  describe('setPending', () => {
    it("faz set do pendingKey com EX 900", async () => {
      const service = createService();
      await service.setPending('agent-1', 'chat-1', 'conv-1');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'human-typing-pending:agent-1:chat-1',
        'conv-1',
        'EX',
        900,
      );
    });
  });

  describe('clearAll', () => {
    it('apaga as duas chaves', async () => {
      const service = createService();
      await service.clearAll('agent-1', 'chat-1');

      expect(mockRedis.del).toHaveBeenCalledWith('human-typing:agent-1:chat-1');
      expect(mockRedis.del).toHaveBeenCalledWith(
        'human-typing-pending:agent-1:chat-1',
      );
    });
  });

  describe('HUMAN_TYPING_PAUSE_MS', () => {
    it('usa 5000ms como pauseMs e EX 5 no refresh', async () => {
      const service = createService(5000);

      expect(service.pauseMs).toBe(5000);
      await service.refresh('agent-1', 'chat-1');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'human-typing:agent-1:chat-1',
        '1',
        'EX',
        5,
      );
    });
  });

  describe('isPaused / clear / pending helpers', () => {
    it('isPaused é true quando a chave existe', async () => {
      mockRedis.exists.mockResolvedValue(1);
      const service = createService();
      await expect(service.isPaused('agent-1', 'chat-1')).resolves.toBe(true);
    });

    it('clear apaga só a chave de pausa', async () => {
      const service = createService();
      await service.clear('agent-1', 'chat-1');
      expect(mockRedis.del).toHaveBeenCalledWith('human-typing:agent-1:chat-1');
      expect(mockRedis.del).toHaveBeenCalledTimes(1);
    });

    it('getPending devolve o conversationId ou null', async () => {
      mockRedis.get.mockResolvedValue('conv-1');
      const service = createService();
      await expect(service.getPending('agent-1', 'chat-1')).resolves.toBe('conv-1');
    });

    it('clearPending apaga o marcador', async () => {
      const service = createService();
      await service.clearPending('agent-1', 'chat-1');
      expect(mockRedis.del).toHaveBeenCalledWith(
        'human-typing-pending:agent-1:chat-1',
      );
    });

    it('touchPending só dá expire se a chave existe', async () => {
      mockRedis.exists.mockResolvedValue(0);
      const service = createService();
      await service.touchPending('agent-1', 'chat-1');
      expect(mockRedis.expire).not.toHaveBeenCalled();

      mockRedis.exists.mockResolvedValue(1);
      await service.touchPending('agent-1', 'chat-1');
      expect(mockRedis.expire).toHaveBeenCalledWith(
        'human-typing-pending:agent-1:chat-1',
        900,
      );
    });
  });
});
