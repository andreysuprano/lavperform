import { of, throwError } from 'rxjs';
import { SwlPermanentHttpError } from 'src/integrations/swl/api/swl-http.error';
import { SwlService } from 'src/integrations/swl/api/swl.service';
import { sleep } from 'src/integrations/sales-import/partner-http-pace';

jest.mock('src/integrations/sales-import/partner-http-pace', () => ({
  ...jest.requireActual('src/integrations/sales-import/partner-http-pace'),
  sleep: jest.fn().mockResolvedValue(undefined),
}));

const sleepMock = sleep as unknown as jest.Mock;

function httpError(status: number, headers: Record<string, string> = {}) {
  return { response: { status, headers } };
}

function page<T>(data: T[], nextCursor: string | null) {
  return { data: { data, pagination: { nextCursor, limit: 100 } } };
}

describe('SwlService (HTTP)', () => {
  const originalUrl = process.env.SWL_API_URL;
  let get: jest.Mock;
  let service: SwlService;

  beforeEach(() => {
    sleepMock.mockClear();
    process.env.SWL_API_URL = 'https://swl.test/parceiros/lavperform/v1/';
    get = jest.fn();
    service = new SwlService({ get } as never);
  });

  afterAll(() => {
    if (originalUrl === undefined) {
      delete process.env.SWL_API_URL;
    } else {
      process.env.SWL_API_URL = originalUrl;
    }
  });

  it('usa a base sem barra dupla e envia Authorization Bearer', async () => {
    get.mockReturnValue(of({ data: { nome: 'Lav', centrosDeCusto: [] } }));

    const result = await service.getLavanderia('tok-1');

    expect(result.nome).toBe('Lav');
    expect(get).toHaveBeenCalledTimes(1);
    const [url, config] = get.mock.calls[0];
    expect(url).toBe('https://swl.test/parceiros/lavperform/v1/lavanderia');
    expect(config.headers.Authorization).toBe('Bearer tok-1');
  });

  it('usa a base padrão quando SWL_API_URL não existe', async () => {
    delete process.env.SWL_API_URL;
    const defaultService = new SwlService({ get } as never);
    get.mockReturnValue(of({ data: { nome: 'Lav', centrosDeCusto: [] } }));

    await defaultService.getLavanderia('t');

    expect(get.mock.calls[0][0]).toBe(
      'https://api.sistemaswl.com.br/parceiros/lavperform/v1/lavanderia',
    );
  });

  it('envia limit=100 e os filtros informados, sem chaves vazias', async () => {
    get.mockReturnValue(of(page([], null)));

    await service.listClientes('t', {
      updatedSince: '2026-11-25T10:00:00-03:00',
    });
    await service.listAtendimentos('t', {
      dataInicio: '2026-08-01',
      dataFim: '2026-09-01',
      cursor: 'c1',
    });
    await service.listExcluidos('t', {});

    expect(get.mock.calls[0][0]).toBe(
      'https://swl.test/parceiros/lavperform/v1/clientes',
    );
    expect(get.mock.calls[0][1].params).toEqual({
      limit: 100,
      updatedSince: '2026-11-25T10:00:00-03:00',
    });
    expect(get.mock.calls[1][0]).toBe(
      'https://swl.test/parceiros/lavperform/v1/atendimentos',
    );
    expect(get.mock.calls[1][1].params).toEqual({
      limit: 100,
      dataInicio: '2026-08-01',
      dataFim: '2026-09-01',
      cursor: 'c1',
    });
    expect(get.mock.calls[2][0]).toBe(
      'https://swl.test/parceiros/lavperform/v1/clientes/excluidos',
    );
    expect(get.mock.calls[2][1].params).toEqual({ limit: 100 });
  });

  describe('listAll', () => {
    it('percorre as páginas até o cursor nulo', async () => {
      const fetchPage = jest
        .fn()
        .mockResolvedValueOnce(page([1, 2], 'c1').data)
        .mockResolvedValueOnce(page([3], 'c2').data)
        .mockResolvedValueOnce(page([4], null).data);

      const result = await service.listAll<number>(fetchPage);

      expect(result).toEqual([1, 2, 3, 4]);
      expect(fetchPage.mock.calls.map((c) => c[0])).toEqual([
        undefined,
        'c1',
        'c2',
      ]);
    });

    it('falha quando o cursor se repete', async () => {
      const fetchPage = jest
        .fn()
        .mockResolvedValueOnce(page([1], 'c1').data)
        .mockResolvedValueOnce(page([2], 'c1').data);

      await expect(service.listAll<number>(fetchPage)).rejects.toThrow(
        /cursor/i,
      );
      expect(fetchPage).toHaveBeenCalledTimes(2);
    });

    it('refaz a lista uma vez sem cursor após 400 de cursor', async () => {
      const fetchPage = jest
        .fn()
        .mockResolvedValueOnce(page([1], 'c1').data)
        .mockRejectedValueOnce(new SwlPermanentHttpError(400, 'cursor'))
        .mockResolvedValueOnce(page([10], 'd1').data)
        .mockResolvedValueOnce(page([11], null).data);

      const result = await service.listAll<number>(fetchPage);

      expect(result).toEqual([10, 11]);
      expect(fetchPage.mock.calls.map((c) => c[0])).toEqual([
        undefined,
        'c1',
        undefined,
        'd1',
      ]);
    });

    it('o segundo 400 vira SwlPermanentHttpError', async () => {
      const fetchPage = jest
        .fn()
        .mockResolvedValueOnce(page([1], 'c1').data)
        .mockRejectedValueOnce(new SwlPermanentHttpError(400, 'cursor'))
        .mockResolvedValueOnce(page([10], 'd1').data)
        .mockRejectedValueOnce(new SwlPermanentHttpError(400, 'cursor'));

      const error = await service.listAll<number>(fetchPage).catch((e) => e);

      expect(error).toBeInstanceOf(SwlPermanentHttpError);
      expect(error.status).toBe(400);
      expect(fetchPage).toHaveBeenCalledTimes(4);
    });

    it('400 sem cursor enviado não é repetido', async () => {
      const fetchPage = jest
        .fn()
        .mockRejectedValue(new SwlPermanentHttpError(400, 'filtro'));

      await expect(service.listAll<number>(fetchPage)).rejects.toBeInstanceOf(
        SwlPermanentHttpError,
      );
      expect(fetchPage).toHaveBeenCalledTimes(1);
    });

    it('400 vindo do HTTP real refaz a lista sem cursor', async () => {
      get
        .mockReturnValueOnce(of(page([1], 'c1')))
        .mockReturnValueOnce(throwError(() => httpError(400)))
        .mockReturnValueOnce(of(page([2], null)));

      const result = await service.listAll((cursor) =>
        service.listClientes('t', { cursor }),
      );

      expect(result).toEqual([2]);
      expect(get).toHaveBeenCalledTimes(3);
      expect(get.mock.calls[1][1].params.cursor).toBe('c1');
      expect(get.mock.calls[2][1].params.cursor).toBeUndefined();
    });
  });

  it.each([401, 403])(
    '%s lança SwlPermanentHttpError sem segunda tentativa',
    async (status) => {
      get.mockReturnValue(throwError(() => httpError(status)));

      const error = await service.getLavanderia('t').catch((e) => e);

      expect(error).toBeInstanceOf(SwlPermanentHttpError);
      expect(error.status).toBe(status);
      expect(get).toHaveBeenCalledTimes(1);
    },
  );

  it('401 durante a paginação interrompe a lista', async () => {
    get
      .mockReturnValueOnce(of(page([{ id: 1 }], 'c1')))
      .mockReturnValueOnce(throwError(() => httpError(401)));

    await expect(
      service.listAll((cursor) => service.listClientes('t', { cursor })),
    ).rejects.toMatchObject({ status: 401 });
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('429 espera o Retry-After e tenta de novo', async () => {
    get
      .mockReturnValueOnce(
        throwError(() => httpError(429, { 'retry-after': '2' })),
      )
      .mockReturnValueOnce(of({ data: { nome: 'Lav', centrosDeCusto: [] } }));

    const result = await service.getLavanderia('t');

    expect(result.nome).toBe('Lav');
    expect(get).toHaveBeenCalledTimes(2);
    expect(sleepMock).toHaveBeenCalledWith(2000);
  });

  it('outros erros HTTP passam sem virar erro permanente', async () => {
    get.mockReturnValue(throwError(() => httpError(500)));

    const error = await service.getLavanderia('t').catch((e) => e);

    expect(error).not.toBeInstanceOf(SwlPermanentHttpError);
    expect(error.response.status).toBe(500);
  });
});
