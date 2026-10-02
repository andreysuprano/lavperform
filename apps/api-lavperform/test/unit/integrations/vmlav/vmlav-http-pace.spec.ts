import { of, throwError } from 'rxjs';
import { VmLavService } from 'src/integrations/vmlav/api/vmlav.service';

function rateLimitError() {
  const error: any = new Error('rate');
  error.response = { status: 429, headers: { 'retry-after': '1' } };
  return error;
}

describe('VmLavService HTTP pace', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('busca as vendas de novo depois de um HTTP 429', async () => {
    jest.useFakeTimers();
    const httpService = {
      get: jest
        .fn()
        .mockReturnValueOnce(throwError(() => rateLimitError()))
        .mockReturnValueOnce(of({ data: [{ idVenda: 1 }] })),
    };
    const service = new VmLavService(httpService as any);

    const pending = service.getSales('api-key', {
      dataInicio: '2026-10-01T00:00:00Z',
      dataTermino: '2026-10-01T23:59:59Z',
      cnpj: '12345678000190',
    });
    const assertion = expect(pending).resolves.toEqual([{ idVenda: 1 }]);
    await jest.advanceTimersByTimeAsync(1000);

    await assertion;
    expect(httpService.get).toHaveBeenCalledTimes(2);
  });
});
