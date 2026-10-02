import { of, throwError } from 'rxjs';
import { MaxlavService } from 'src/integrations/maxlav/api/maxlav.service';

function http429(retryAfter?: string) {
  const error: any = new Error('rate');
  error.response = {
    status: 429,
    headers: retryAfter ? { 'retry-after': retryAfter } : {},
  };
  return error;
}

describe('MaxlavService HTTP pace', () => {
  const ordersPage = (results: Array<{ id: string }>) =>
    of({ data: { results } });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('espera 400 ms a partir da segunda página', async () => {
    const httpService = {
      get: jest
        .fn()
        .mockReturnValueOnce(ordersPage([{ id: '1' }]))
        .mockReturnValueOnce(ordersPage([])),
    };
    const service = new MaxlavService(httpService as any);
    const sleep = jest
      .spyOn(service as any, 'sleep')
      .mockResolvedValue(undefined);

    await service.getDailySales('token', '2026-10-01');

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(400);
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
        .mockReturnValueOnce(ordersPage([])),
    };
    const service = new MaxlavService(httpService as any);
    const sleep = jest
      .spyOn(service as any, 'sleep')
      .mockResolvedValue(undefined);

    await service.getOrdersPage(
      'token',
      1,
      '2026-10-01T00:00:00.000Z',
      '2026-10-01T23:59:59.999Z',
    );

    expect(httpService.get).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it('em 429 sem Retry-After espera 60 segundos', async () => {
    const httpService = {
      get: jest
        .fn()
        .mockReturnValueOnce(throwError(() => http429()))
        .mockReturnValueOnce(ordersPage([])),
    };
    const service = new MaxlavService(httpService as any);
    const sleep = jest
      .spyOn(service as any, 'sleep')
      .mockResolvedValue(undefined);

    await service.getOrdersPage(
      'token',
      1,
      '2026-10-01T00:00:00.000Z',
      '2026-10-01T23:59:59.999Z',
    );

    expect(sleep).toHaveBeenCalledWith(60_000);
  });
});
