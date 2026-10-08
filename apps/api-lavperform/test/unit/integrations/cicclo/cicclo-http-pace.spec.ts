import { of, throwError } from 'rxjs';
import { CiccloService } from 'src/integrations/cicclo/api/cicclo.service';

describe('CiccloService HTTP pace', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('repete o POST depois de um HTTP 429', async () => {
    jest.useFakeTimers();
    const error: any = new Error('rate');
    error.response = { status: 429, headers: { 'retry-after': '1' } };
    const httpService = {
      post: jest
        .fn()
        .mockReturnValueOnce(throwError(() => error))
        .mockReturnValueOnce(
          of({ data: { success: true, sales: [{ id: 7 }] } }),
        ),
    };
    const service = new CiccloService(httpService as any);

    const pending = service.getSales(
      'loja@cicclo.test',
      'secret',
      '2026-10-01',
      '2026-10-01',
    );
    const assertion = expect(pending).resolves.toEqual([{ id: 7 }]);
    await jest.advanceTimersByTimeAsync(1000);

    await assertion;
    expect(httpService.post).toHaveBeenCalledTimes(2);
  });
});
