import {
  catchupDates,
  previousUtcDateOnly,
  salesBackfill90JobId,
  salesCatchupJobId,
  salesDailyImportJobId,
  salesImportSlot,
  utcDateOnly,
} from 'src/integrations/sales-import/sales-import-schedule';

describe('sales-import-schedule', () => {
  it('corta o dia UTC e o dia anterior', () => {
    const now = new Date('2026-10-02T00:15:00.000Z');
    expect(utcDateOnly(now)).toBe('2026-10-02');
    expect(previousUtcDateOnly(now)).toBe('2026-10-01');
    expect(catchupDates(now)).toEqual({
      today: '2026-10-02',
      yesterday: '2026-10-01',
    });
  });

  it('slot de 30 minutos em UTC', () => {
    expect(salesImportSlot(new Date('2026-10-01T23:29:00.000Z'))).toBe('2300');
    expect(salesImportSlot(new Date('2026-10-01T23:30:00.000Z'))).toBe('2330');
    expect(salesImportSlot(new Date('2026-10-01T00:00:00.000Z'))).toBe('0000');
  });

  it('jobId de catch-up inclui parceiro, empresa, data e slot', () => {
    const now = new Date('2026-10-01T23:42:00.000Z');
    expect(salesCatchupJobId('vmlav', 'company-1', '2026-10-01', now)).toBe(
      'vmlav-import:company-1:2026-10-01:2330',
    );
  });

  it('slots diferentes do mesmo dia geram jobId diferente', () => {
    const a = salesCatchupJobId(
      'vmlav',
      'c1',
      '2026-10-01',
      new Date('2026-10-01T14:00:00.000Z'),
    );
    const b = salesCatchupJobId(
      'vmlav',
      'c1',
      '2026-10-01',
      new Date('2026-10-01T14:30:00.000Z'),
    );
    expect(a).toBe('vmlav-import:c1:2026-10-01:1400');
    expect(b).toBe('vmlav-import:c1:2026-10-01:1430');
    expect(a).not.toBe(b);
  });

  it('jobId de backfill é um por empresa', () => {
    expect(salesBackfill90JobId('agidez', 'company-1')).toBe(
      'agidez-backfill-90:company-1',
    );
  });

  it('jobId diário estável não inclui o slot de 30 minutos', () => {
    expect(salesDailyImportJobId('cicclo', 'company-1', '2026-09-01')).toBe(
      'cicclo-import:company-1:2026-09-01',
    );
    expect(salesDailyImportJobId('maxlav', 'company-1', '2026-09-01')).toBe(
      'maxlav-import:company-1:2026-09-01',
    );
    expect(salesDailyImportJobId('l2automate', 'c1', '2026-09-02')).toBe(
      'l2automate-import:c1:2026-09-02',
    );
  });
});
