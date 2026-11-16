import { of, throwError } from 'rxjs';
import {
  WaymoneyIncompleteListError,
  WaymoneyLoginRejectedError,
  WaymoneyService,
} from 'src/integrations/waymoney/api/waymoney.service';
import {
  isImportableCycle,
  isImportablePackagePurchase,
  waymoneyMethodCodes,
  waymoneyPaymentLabel,
} from 'src/integrations/waymoney/api/waymoney.types';

const credentials = { email: 'loja@example.com', password: 'secret' };
const startDate = '2026-11-09T03:00:00.000Z';
const endDate = '2026-11-10T02:59:59.999Z';

function httpDouble() {
  return { post: jest.fn(), get: jest.fn() };
}

function httpError(status: number, headers?: Record<string, string>) {
  const error: any = new Error(`http ${status}`);
  error.response = headers ? { status, headers } : { status };
  return error;
}

describe('WaymoneyService', () => {
  const previousUrl = process.env.WAYMONEY_API_URL;

  beforeEach(() => {
    process.env.WAYMONEY_API_URL = 'https://waymoney.example';
  });

  afterEach(() => {
    process.env.WAYMONEY_API_URL = previousUrl;
    jest.useRealTimers();
  });

  it('lista pagamentos com Bearer e pagina até o total', async () => {
    jest.useFakeTimers();
    const http = httpDouble();
    http.post.mockReturnValue(of({ data: { token: 'tok-1' } }));
    const page1 = Array.from({ length: 50 }, (_, index) => ({
      id: `pay-${index}`,
    }));
    let page2Calls = 0;
    http.get.mockImplementation((_url: string, config?: { params?: { page?: number } }) => {
      if (config?.params?.page === 2) {
        page2Calls += 1;
        return of({
          data: {
            payments: [{ id: 'pay-50' }],
            total: 51,
            page: 2,
            limit: 50,
            totalPages: 2,
          },
        });
      }
      return of({
        data: {
          payments: page1,
          total: 51,
          page: 1,
          limit: 50,
          totalPages: 2,
        },
      });
    });
    const service = new WaymoneyService(http as any);
    const session = await service.openSession(credentials);

    const pending = session.listPayments('branch-1', startDate, endDate);
    await jest.advanceTimersByTimeAsync(0);
    expect(page2Calls).toBe(0);
    const assertion = expect(pending).resolves.toHaveLength(51);
    await jest.advanceTimersByTimeAsync(400);
    await assertion;

    expect(http.post).toHaveBeenCalledWith(
      'https://waymoney.example/api/auth/login',
      { email: 'loja@example.com', password: 'secret' },
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
    expect(http.get).toHaveBeenNthCalledWith(
      1,
      'https://waymoney.example/api/payments',
      expect.objectContaining({
        headers: { Authorization: 'Bearer tok-1', accept: 'application/json' },
        params: {
          branchId: 'branch-1',
          startDate,
          endDate,
          page: 1,
          limit: 50,
        },
      }),
    );
    expect(http.get).toHaveBeenNthCalledWith(
      2,
      'https://waymoney.example/api/payments',
      expect.objectContaining({
        headers: { Authorization: 'Bearer tok-1', accept: 'application/json' },
        params: expect.objectContaining({ page: 2, limit: 50 }),
      }),
    );
    expect(page2Calls).toBe(1);
  });

  it('falha a lista de pacotes quando total é maior que o array', async () => {
    const http = httpDouble();
    http.post.mockReturnValue(of({ data: { token: 'tok-1' } }));
    http.get.mockReturnValue(
      of({
        data: {
          packagePurchases: [{ id: 'pkg-1', amount: 30, paymentMethod: 'PIX' }],
          total: 2,
        },
      }),
    );
    const service = new WaymoneyService(http as any);
    const session = await service.openSession(credentials);

    await expect(
      session.listPackagePurchases('branch-1', startDate, endDate),
    ).rejects.toBeInstanceOf(WaymoneyIncompleteListError);
    expect(http.get).toHaveBeenCalledWith(
      'https://waymoney.example/api/package-purchases',
      expect.objectContaining({
        headers: { Authorization: 'Bearer tok-1', accept: 'application/json' },
        params: { branchId: 'branch-1', startDate, endDate },
      }),
    );
  });

  it('falha a lista de pagamentos quando a página acaba antes do total', async () => {
    const http = httpDouble();
    http.post.mockReturnValue(of({ data: { token: 'tok-1' } }));
    http.get.mockReturnValue(
      of({
        data: {
          payments: [{ id: 'pay-1' }],
          total: 3,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      }),
    );
    const service = new WaymoneyService(http as any);
    const session = await service.openSession(credentials);

    await expect(
      session.listPayments('branch-1', startDate, endDate),
    ).rejects.toBeInstanceOf(WaymoneyIncompleteListError);
  });

  it('faz um login novo quando a consulta responde 401 e repete a chamada uma vez', async () => {
    const http = httpDouble();
    http.post
      .mockReturnValueOnce(of({ data: { token: 'tok-velho' } }))
      .mockReturnValueOnce(of({ data: { token: 'tok-novo' } }));
    http.get
      .mockReturnValueOnce(throwError(() => httpError(401)))
      .mockReturnValueOnce(of({ data: { id: 'client-1', name: 'Ana' } }));
    const service = new WaymoneyService(http as any);
    const session = await service.openSession(credentials);

    await expect(session.getClient('client-1')).resolves.toEqual({
      id: 'client-1',
      name: 'Ana',
    });
    expect(http.post).toHaveBeenCalledTimes(2);
    expect(http.get).toHaveBeenLastCalledWith(
      'https://waymoney.example/api/clients/client-1',
      expect.objectContaining({
        headers: { Authorization: 'Bearer tok-novo', accept: 'application/json' },
      }),
    );
  });

  it('não renova a sessão quando o próprio login responde 401', async () => {
    const http = httpDouble();
    http.post
      .mockReturnValueOnce(of({ data: { token: 'tok-velho' } }))
      .mockReturnValue(throwError(() => httpError(401)));
    http.get.mockReturnValue(throwError(() => httpError(401)));
    const service = new WaymoneyService(http as any);
    const session = await service.openSession(credentials);

    await expect(session.listBranches()).rejects.toBeInstanceOf(
      WaymoneyLoginRejectedError,
    );
    expect(http.post).toHaveBeenCalledTimes(2);
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('repete a consulta depois de HTTP 429', async () => {
    jest.useFakeTimers();
    const http = httpDouble();
    http.post.mockReturnValue(of({ data: { token: 'tok-1' } }));
    http.get
      .mockReturnValueOnce(throwError(() => httpError(429)))
      .mockReturnValueOnce(of({ data: [{ id: 'branch-1', name: 'Centro' }] }));
    const service = new WaymoneyService(http as any);
    const session = await service.openSession(credentials);

    const pending = session.listBranches();
    const assertion = expect(pending).resolves.toEqual([
      { id: 'branch-1', name: 'Centro' },
    ]);
    await jest.advanceTimersByTimeAsync(400);
    await assertion;
    expect(http.get).toHaveBeenCalledTimes(2);
    expect(http.get).toHaveBeenCalledWith(
      'https://waymoney.example/api/branches',
      expect.objectContaining({
        headers: { Authorization: 'Bearer tok-1', accept: 'application/json' },
      }),
    );
  });

  it('não repete a senha quando o login responde 401', async () => {
    const http = httpDouble();
    http.post.mockReturnValue(throwError(() => httpError(401)));
    const service = new WaymoneyService(http as any);

    await expect(service.openSession(credentials)).rejects.toBeInstanceOf(
      WaymoneyLoginRejectedError,
    );
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.get).not.toHaveBeenCalled();
  });

  it('devolve null quando o cliente responde 404 e propaga outro erro HTTP', async () => {
    const http = httpDouble();
    http.post.mockReturnValue(of({ data: { token: 'tok-1' } }));
    http.get.mockReturnValueOnce(throwError(() => httpError(404)));
    const service = new WaymoneyService(http as any);
    const session = await service.openSession(credentials);

    await expect(session.getClient('ausente')).resolves.toBeNull();
    expect(http.post).toHaveBeenCalledTimes(1);

    http.get.mockReturnValueOnce(throwError(() => httpError(500)));
    await expect(session.getClient('ausente')).rejects.toEqual(
      expect.objectContaining({ response: { status: 500 } }),
    );
  });
});

describe('filtros WayMoney', () => {
  it('normaliza paymentMethod em códigos', () => {
    expect(waymoneyMethodCodes('PIX')).toEqual(['PIX']);
    expect(waymoneyMethodCodes([' CREDIT ', 'DEBIT'])).toEqual([
      'CREDIT',
      'DEBIT',
    ]);
    expect(waymoneyMethodCodes('')).toEqual([]);
    expect(waymoneyMethodCodes(null)).toEqual([]);
  });

  it('entra ciclo com cartão, PIX ou voucher e fica de fora pacote, cashback, estorno e source USER', () => {
    expect(isImportableCycle({ paymentMethod: 'CREDIT' })).toBe(true);
    expect(isImportableCycle({ paymentMethod: 'DEBIT' })).toBe(true);
    expect(isImportableCycle({ paymentMethod: 'PIX' })).toBe(true);
    expect(isImportableCycle({ paymentMethod: 'VOUCHER' })).toBe(true);
    expect(
      isImportableCycle({ paymentMethod: ['CASHBACK', 'PIX'] }),
    ).toBe(true);
    expect(
      isImportableCycle({ paymentMethod: ['PACKAGE', 'CREDIT'] }),
    ).toBe(false);
    expect(isImportableCycle({ paymentMethod: ['CASHBACK'] })).toBe(false);
    expect(isImportableCycle({ paymentMethod: 'CASHBACK' })).toBe(false);
    expect(
      isImportableCycle({
        paymentMethod: 'PIX',
        refundedAt: '2026-11-09T12:00:00.000Z',
      }),
    ).toBe(false);
    expect(
      isImportableCycle({ paymentMethod: 'PIX', source: 'USER' }),
    ).toBe(false);
    expect(isImportableCycle({ paymentMethod: 'PIX', source: 'MACHINE' })).toBe(
      true,
    );
  });

  it('entra compra de pacote com valor e método diferente de POINTS', () => {
    expect(
      isImportablePackagePurchase({ amount: 25, paymentMethod: 'PIX' }),
    ).toBe(true);
    expect(
      isImportablePackagePurchase({ amount: 25, paymentMethod: 'POINTS' }),
    ).toBe(false);
    expect(
      isImportablePackagePurchase({ amount: 0, paymentMethod: 'PIX' }),
    ).toBe(false);
    expect(
      isImportablePackagePurchase({ amount: -1, paymentMethod: 'CREDIT' }),
    ).toBe(false);
  });

  it('rotula os códigos aceitos e preserva código desconhecido', () => {
    expect(waymoneyPaymentLabel('CREDIT')).toBe('Cartão de crédito');
    expect(waymoneyPaymentLabel('DEBIT')).toBe('Cartão de débito');
    expect(waymoneyPaymentLabel('PIX')).toBe('PIX');
    expect(waymoneyPaymentLabel('VOUCHER')).toBe('Voucher');
    expect(waymoneyPaymentLabel(['DEBIT', 'PIX'])).toBe(
      'Cartão de débito + PIX',
    );
    expect(waymoneyPaymentLabel(['CREDIT', 'CASHBACK'])).toBe(
      'Cartão de crédito',
    );
    expect(waymoneyPaymentLabel('POINTS')).toBe('POINTS');
    expect(waymoneyPaymentLabel('BOLETO')).toBe('BOLETO');
  });
});
