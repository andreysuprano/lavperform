import { resolveCreatedAtFilter } from 'src/orders/application/order-created-at.filter';

describe('resolveCreatedAtFilter', () => {
  const todayStart = new Date('2026-08-21T03:00:00.000Z');
  const todayEnd = new Date('2026-08-22T03:00:00.000Z');

  it('usa bounds do dia e ignora startDate/endDate quando period é today', () => {
    expect(
      resolveCreatedAtFilter({
        period: 'today',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        todayStart,
        todayEnd,
      }),
    ).toEqual({ gte: todayStart, lt: todayEnd });
  });

  it('usa startDate/endDate quando period está ausente', () => {
    expect(
      resolveCreatedAtFilter({
        startDate: '2026-08-01T00:00:00.000Z',
        endDate: '2026-08-31T23:59:59.000Z',
      }),
    ).toEqual({
      gte: new Date('2026-08-01T00:00:00.000Z'),
      lte: new Date('2026-08-31T23:59:59.000Z'),
    });
  });

  it('retorna undefined sem period e sem ambas as datas', () => {
    expect(resolveCreatedAtFilter({ startDate: '2026-08-01' })).toBeUndefined();
    expect(resolveCreatedAtFilter({})).toBeUndefined();
  });
});
