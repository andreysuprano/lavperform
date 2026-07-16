import { BadRequestException } from '@nestjs/common';
import { ImportOrderHistoryDto } from '../companies/application/dto/import-order-history.dto';
import { parseUTCDate, toDateOnlyString } from '../common/utils/date.utils';

export const DEFAULT_IMPORT_HISTORY_DAYS = 90;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function resolveImportDateRange(dto: ImportOrderHistoryDto = {}): {
  startDate: Date;
  endDate: Date;
} {
  const endDate = dto.endDate ? parseUTCDate(dto.endDate)! : new Date();
  const startDate = dto.startDate
    ? parseUTCDate(dto.startDate)!
    : new Date(endDate.getTime() - DEFAULT_IMPORT_HISTORY_DAYS * MS_PER_DAY);

  if (startDate > endDate) {
    throw new BadRequestException(
      'A data inicial deve ser anterior ou igual à data final',
    );
  }

  return { startDate, endDate };
}

export function buildUtcDateOnlyRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    dates.push(toDateOnlyString(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export function formatImportDateRangeResult(
  startDate: Date,
  endDate: Date,
  dates: string[],
  jobsCreated: number,
  message: string,
) {
  return {
    message,
    startDate: toDateOnlyString(startDate),
    endDate: toDateOnlyString(endDate),
    totalDays: dates.length,
    jobsCreated,
  };
}
