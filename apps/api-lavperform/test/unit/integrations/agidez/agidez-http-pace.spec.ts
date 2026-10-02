import { of } from 'rxjs';
import { AgidezService } from 'src/integrations/agidez/api/agidez.service';

describe('AgidezService HTTP pace', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('espera 400 ms entre tickets e serviços', async () => {
    const httpService = {
      post: jest.fn().mockReturnValue(of({ data: [] })),
    };
    const service = new AgidezService(httpService as any);
    const sleep = jest
      .spyOn(service as any, 'sleep')
      .mockResolvedValue(undefined);

    await service.getDailySales(
      {
        apiPassword: 'pw',
        accountCode: 1,
        storeCode: 2,
        token: 'tok',
      },
      '2026-10-01',
    );

    expect(sleep).toHaveBeenNthCalledWith(1, 400);
    expect(sleep.mock.calls.map((call) => call[0])).toEqual([400, 400, 400, 400]);
  });
});
