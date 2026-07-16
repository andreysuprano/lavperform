import { of, throwError } from 'rxjs';
import { EvolutionClient } from 'src/whatsapp/clients/evolution.client';

describe('EvolutionClient', () => {
  const httpService: any = {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EVOLUTION_API_URL = 'http://evo.test';
    process.env.EVOLUTION_API_KEY = 'api-key';
  });

  const clientFactory = () => new EvolutionClient(httpService);

  it('creates instance with proper endpoint and headers', async () => {
    httpService.post = jest.fn().mockReturnValue(of({ data: { ok: true } }));
    const client = clientFactory();

    const result = await client.createInstance({ instanceName: 'inst', webhookByEvents: false } as any);

    expect(httpService.post).toHaveBeenCalledWith(
      'http://evo.test/instance/create',
      expect.objectContaining({ instanceName: 'inst' }),
      expect.objectContaining({ headers: expect.objectContaining({ apikey: 'api-key' }) }),
    );
    expect(result).toEqual({ ok: true });
  });

  it('propagates formatted error on failure', async () => {
    const error = {
      message: 'boom',
      response: { data: 'err', status: 500, statusText: 'ERR' },
      config: { url: 'x', method: 'GET', headers: {} },
    };
    httpService.get = jest.fn().mockReturnValue(throwError(() => error));
    const client = clientFactory();

    await expect(client.connectInstance('inst')).rejects.toThrow('Erro ao conectar instância do WhatsApp');
  });

  it('connects instance successfully', async () => {
    httpService.get = jest.fn().mockReturnValue(of({ data: { code: '123' } }));
    const client = clientFactory();

    const res = await client.connectInstance('inst');

    expect(httpService.get).toHaveBeenCalledWith(
      'http://evo.test/instance/connect/inst',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(res).toEqual({ code: '123' });
  });

  it('deletes instance', async () => {
    httpService.delete = jest.fn().mockReturnValue(of({ data: { deleted: true } }));
    const client = clientFactory();

    const result = await client.deleteInstance('inst');

    expect(httpService.delete).toHaveBeenCalledWith(
      'http://evo.test/instance/delete/inst',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(result).toEqual({ deleted: true });
  });

  it('gets connection state', async () => {
    httpService.get = jest.fn().mockReturnValue(of({ data: { instance: { state: 'open' } } }));
    const client = clientFactory();

    const result = await client.getConnectionState('inst');

    expect(httpService.get).toHaveBeenCalledWith(
      'http://evo.test/instance/connectionState/inst',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(result).toEqual({ instance: { state: 'open' } });
  });

  it('sends media message', async () => {
    httpService.post = jest.fn().mockReturnValue(of({ data: { ok: true } }));
    const client = clientFactory();

    const res = await client.sendMessageWithImage('5511999', 'msg', 'url', 'inst');

    expect(httpService.post).toHaveBeenCalledWith(
      'http://evo.test/message/sendMedia/inst',
      expect.objectContaining({ number: '5511999', media: 'url', caption: 'msg' }),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(res).toEqual({ ok: true });
  });

  it('handles typing errors', async () => {
    httpService.post = jest.fn().mockReturnValue(throwError(() => new Error('fail')));
    const client = clientFactory();

    await expect(client.sendTyping('5511', 'inst')).rejects.toThrow('Erro ao enviar presença');
  });

  it('sends typing successfully', async () => {
    httpService.post = jest.fn().mockReturnValue(of({ data: { ok: true } }));
    const client = clientFactory();

    const res = await client.sendTyping('5511', 'inst');

    expect(httpService.post).toHaveBeenCalledWith(
      'http://evo.test/chat/sendPresence/inst',
      expect.objectContaining({ number: '5511' }),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(res).toEqual({ ok: true });
  });
});
