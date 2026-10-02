import { of, throwError } from 'rxjs';
import { L2AutomateService } from 'src/integrations/l2automate/api/l2automate.service';

const PAGE_DELAY_MS = Math.ceil((15 * 60 * 1000) / 100);

function page(total: number, ids: string[]) {
  return of({
    data: {
      success: true,
      sales: ids.map((id) => ({ id })),
      pagination: { total },
    },
  });
}

function http429(retryAfter?: string) {
  const error: any = new Error('rate');
  error.response = {
    status: 429,
    headers: retryAfter ? { 'retry-after': retryAfter } : {},
  };
  return error;
}

describe('L2AutomateService HTTP pace', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('mantém o intervalo de 100 requisições a cada 15 minutos entre páginas', async () => {
    const httpService = {
      get: jest
        .fn()
        .mockReturnValueOnce(page(600, ['a']))
        .mockReturnValueOnce(page(600, ['b'])),
    };
    const service = new L2AutomateService(httpService as any);
    const sleep = jest
      .spyOn(service as any, 'sleep')
      .mockResolvedValue(undefined);

    await service.getAllSales('token', '2026-10-01', '2026-10-01');

    expect(PAGE_DELAY_MS).toBe(9000);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(PAGE_DELAY_MS);
  });

  it('em 429 com data HTTP espera o delta e tenta de novo', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-02T15:00:00.000Z'));
    const httpService = {
      get: jest
        .fn()
        .mockReturnValueOnce(
          throwError(() => http429('Fri, 02 Oct 2026 15:00:02 GMT')),
        )
        .mockReturnValueOnce(page(0, [])),
    };
    const service = new L2AutomateService(httpService as any);
    const sleep = jest
      .spyOn(service as any, 'sleep')
      .mockResolvedValue(undefined);

    await service.getSales('token', '2026-10-01', '2026-10-01');

    expect(httpService.get).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it('em 429 sem Retry-After espera a janela de 15 minutos', async () => {
    const httpService = {
      get: jest
        .fn()
        .mockReturnValueOnce(throwError(() => http429()))
        .mockReturnValueOnce(page(0, [])),
    };
    const service = new L2AutomateService(httpService as any);
    const sleep = jest
      .spyOn(service as any, 'sleep')
      .mockResolvedValue(undefined);

    await service.getSales('token', '2026-10-01', '2026-10-01');

    expect(sleep).toHaveBeenCalledWith(15 * 60 * 1000);
  });
});
