import { DateTime } from 'luxon';

export const WAYMONEY_DEFAULT_TIME_ZONE = 'America/Sao_Paulo';

export function waymoneyDayRange(
  date: string,
  timeZone?: string | null,
): { startDate: string; endDate: string } {
  const zone = timeZone?.trim()
    ? timeZone.trim()
    : WAYMONEY_DEFAULT_TIME_ZONE;
  const start = DateTime.fromISO(date, { zone }).startOf('day');
  const end = start.endOf('day');
  if (!start.isValid || !end.isValid) {
    throw new Error(`Data ou fuso WayMoney inválido: ${date} (${zone})`);
  }
  return {
    startDate: start.toUTC().toISO()!,
    endDate: end.toUTC().toISO()!,
  };
}

export function waymoneyCatchupDates(now: Date = new Date()): {
  today: string;
  yesterday: string;
} {
  const today = DateTime.fromJSDate(now, { zone: 'utc' })
    .setZone(WAYMONEY_DEFAULT_TIME_ZONE)
    .startOf('day');
  return {
    today: today.toISODate()!,
    yesterday: today.minus({ days: 1 }).toISODate()!,
  };
}
