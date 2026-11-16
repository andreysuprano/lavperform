import { of, throwError } from 'rxjs';
import {
  WindelLoginRejectedError,
  WindelMfaRequiredError,
  WindelService,
} from 'src/integrations/windel/api/windel.service';

const credentials = { email: 'loja@example.com', password: 'secret' };

function httpDouble() {
  return { post: jest.fn(), get: jest.fn() };
}

describe('WindelService', () => {
  const previousUrl = process.env.WINDEL_API_URL;

  beforeEach(() => {
    process.env.WINDEL_API_URL = 'https://windel.example/api';
  });

  afterEach(() => {
    process.env.WINDEL_API_URL = previousUrl;
    jest.useRealTimers();
  });

  it('lista ordens atendidas do dia com Bearer e pagina até esgotar o count', async () => {
    jest.useFakeTimers();
    const http = httpDouble();
    http.post.mockReturnValue(of({ data: { token: 'tok-1' } }));
    http.get
      .mockReturnValueOnce(
        of({ data: { list: [{ id: 1, situacao: 'Atendido' }], count: 2 } }),
      )
      .mockReturnValueOnce(
        of({ data: { list: [{ id: 2, situacao: 'Atendido' }], count: 2 } }),
      );
    const service = new WindelService(http as any);

    const pending = service.listAttendedOrders(credentials, '2026-10-20');
    const assertion = expect(pending).resolves.toEqual([
      { id: 1, situacao: 'Atendido' },
      { id: 2, situacao: 'Atendido' },
    ]);
    await jest.advanceTimersByTimeAsync(400);
    await assertion;

    expect(http.post).toHaveBeenCalledWith(
      'https://windel.example/api/v1/auth/login/',
      { email: 'loja@example.com', password: 'secret' },
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
    expect(http.get).toHaveBeenNthCalledWith(
      1,
      'https://windel.example/api/v1/docs/service-order',
      expect.objectContaining({
        headers: { Authorization: 'Bearer tok-1', accept: 'application/json' },
        params: expect.objectContaining({
          situacao: 'Atendido',
          'createdAt[gte]': '2026-10-20T00:00:00.000Z',
          'createdAt[lte]': '2026-10-20T23:59:59.999Z',
          sort: 'createdAt',
          sortOrder: 'desc',
          page: 1,
          pageSize: 25,
        }),
      }),
    );
  });

  it('lista o cadastro de clientes com cliente=true e pagina até o count', async () => {
    jest.useFakeTimers();
    const http = httpDouble();
    http.post.mockReturnValue(of({ data: { token: 'tok-1' } }));
    const page = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      nome: 'Ana',
      telefone: '11999999999',
    }));
    http.get
      .mockReturnValueOnce(of({ data: { list: page, count: 101 } }))
      .mockReturnValueOnce(
        of({ data: { list: [{ id: 101, nome: 'Bia', telefoneContato: '11888888888' }], count: 101 } }),
      );
    const service = new WindelService(http as any);

    const pending = service.listClients(credentials);
    const assertion = expect(pending).resolves.toHaveLength(101);
    await jest.advanceTimersByTimeAsync(400);
    await assertion;

    expect(http.get).toHaveBeenNthCalledWith(
      1,
      'https://windel.example/api/v1/people',
      expect.objectContaining({
        params: expect.objectContaining({
          cliente: 'true',
          sort: 'id',
          sortOrder: 'asc',
          page: 1,
          pageSize: 100,
        }),
      }),
    );
    expect(http.get).toHaveBeenNthCalledWith(
      2,
      'https://windel.example/api/v1/people',
      expect.objectContaining({
        params: expect.objectContaining({ page: 2, pageSize: 100 }),
      }),
    );
  });

  it('falha sem repetir a senha quando o login pede segundo fator', async () => {
    const http = httpDouble();
    http.post.mockReturnValue(of({ data: { mfaObrigatorio: true } }));
    const service = new WindelService(http as any);

    await expect(
      service.listAttendedOrders(credentials, '2026-10-20'),
    ).rejects.toBeInstanceOf(WindelMfaRequiredError);
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.get).not.toHaveBeenCalled();
  });

  it('faz um login novo quando a consulta responde 401', async () => {
    const http = httpDouble();
    http.post
      .mockReturnValueOnce(of({ data: { token: 'tok-velho' } }))
      .mockReturnValueOnce(of({ data: { token: 'tok-novo' } }));
    const denied: any = new Error('unauthorized');
    denied.response = { status: 401 };
    http.get
      .mockReturnValueOnce(throwError(() => denied))
      .mockReturnValueOnce(of({ data: { id: 9, numero: 1, createdAt: '2026-10-20T00:00:00.000Z' } }));
    const service = new WindelService(http as any);

    await expect(service.getOrder(credentials, 9)).resolves.toEqual(
      expect.objectContaining({ id: 9 }),
    );
    expect(http.post).toHaveBeenCalledTimes(2);
    expect(http.get).toHaveBeenLastCalledWith(
      'https://windel.example/api/v1/docs/service-order/9',
      expect.objectContaining({
        headers: { Authorization: 'Bearer tok-novo', accept: 'application/json' },
      }),
    );
  });

  it('busca a pessoa e repete depois de HTTP 429', async () => {
    jest.useFakeTimers();
    const http = httpDouble();
    http.post.mockReturnValue(of({ data: { token: 'tok-1' } }));
    const rate: any = new Error('rate');
    rate.response = { status: 429, headers: { 'retry-after': '1' } };
    http.get
      .mockReturnValueOnce(throwError(() => rate))
      .mockReturnValueOnce(of({ data: { telefone: '11999999999', email: 'a@b.co' } }));
    const service = new WindelService(http as any);

    const pending = service.getPerson(credentials, 4);
    const assertion = expect(pending).resolves.toEqual(
      expect.objectContaining({ telefone: '11999999999' }),
    );
    await jest.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(http.get).toHaveBeenCalledTimes(2);
  });

  it('não repete a senha quando o login responde 401', async () => {
    const http = httpDouble();
    const denied: any = new Error('unauthorized');
    denied.response = { status: 401 };
    http.post.mockReturnValue(throwError(() => denied));
    const service = new WindelService(http as any);

    await expect(
      service.listAttendedOrders(credentials, '2026-10-20'),
    ).rejects.toBeInstanceOf(WindelLoginRejectedError);
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.get).not.toHaveBeenCalled();
  });
});
