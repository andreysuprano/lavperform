import { BadRequestException } from '@nestjs/common';
import {
  buildUtcDateOnlyRange,
  resolveImportDateRange,
} from 'src/integrations/import-date-range.util';

describe('import-date-range.util', () => {
  it('usa intervalo informado sem limitar a 90 dias', () => {
    const { startDate, endDate } = resolveImportDateRange({
      startDate: '2024-01-01',
      endDate: '2024-05-01',
    });

    const dates = buildUtcDateOnlyRange(startDate, endDate);

    expect(dates).toHaveLength(122);
    expect(dates[0]).toBe('2024-01-01');
    expect(dates.at(-1)).toBe('2024-05-01');
  });

  it('aplica default de 90 dias quando datas são omitidas', () => {
    const { startDate, endDate } = resolveImportDateRange({});
    const dates = buildUtcDateOnlyRange(startDate, endDate);

    expect(dates).toHaveLength(91);
    expect(startDate <= endDate).toBe(true);
  });

  it('rejeita intervalo invertido', () => {
    expect(() =>
      resolveImportDateRange({
        startDate: '2025-01-01',
        endDate: '2024-01-01',
      }),
    ).toThrow(BadRequestException);
  });
});
