import { utcDateOnly } from '../sales-import/sales-import-schedule';

export const WINDEL_LOOKBACK_DAYS = 30;

export function windelLookbackDates(now: Date = new Date()): string[] {
  const dates: string[] = [];
  for (let offset = 0; offset < WINDEL_LOOKBACK_DAYS; offset += 1) {
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() - offset);
    dates.push(utcDateOnly(day));
  }
  return dates;
}

export function windelReplayRange(now: Date = new Date()): {
  startDate: string;
  endDate: string;
} {
  const dates = windelLookbackDates(now);
  return {
    startDate: dates[dates.length - 1],
    endDate: dates[0],
  };
}

export function windelCustomersJobId(
  companyId: string,
  now: Date = new Date(),
): string {
  return `windel-customers:${companyId}:${utcDateOnly(now)}`;
}

export function windelLookbackJobId(
  companyId: string,
  date: string,
  now: Date = new Date(),
): string {
  return `windel-lookback:${companyId}:${date}:${utcDateOnly(now)}`;
}
