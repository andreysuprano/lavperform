import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';

export const TRAFFIC_TIME_ZONE = 'America/Sao_Paulo';
const DATE_MESSAGE = 'Informe as datas no formato aaaa-mm-dd.';

export type TrafficDateRange = { from: string; to: string };

function parseDay(value: string): DateTime {
  const parsed = DateTime.fromISO(value, { zone: TRAFFIC_TIME_ZONE });
  if (!parsed.isValid || parsed.toISODate() !== value) {
    throw new BadRequestException(DATE_MESSAGE);
  }
  return parsed.startOf('day');
}

export function resolveTrafficPeriod(
  from: string | undefined,
  to: string | undefined,
  now: Date = new Date(),
): TrafficDateRange {
  if (from === undefined && to === undefined) {
    const end = DateTime.fromJSDate(now, { zone: TRAFFIC_TIME_ZONE }).startOf('day');
    const start = end.minus({ days: 29 });
    return { from: start.toISODate()!, to: end.toISODate()! };
  }
  const start = parseDay((from ?? '').trim());
  const end = parseDay((to ?? '').trim());
  if (start > end) {
    throw new BadRequestException('A data inicial é posterior à data final.');
  }
  const days = end.diff(start, 'days').days + 1;
  if (days > 90) {
    throw new BadRequestException('O intervalo máximo é de 90 dias.');
  }
  return { from: start.toISODate()!, to: end.toISODate()! };
}

export function previousTrafficPeriod(period: TrafficDateRange): TrafficDateRange {
  const start = parseDay(period.from);
  const end = parseDay(period.to);
  const count = end.diff(start, 'days').days + 1;
  const prevEnd = start.minus({ days: 1 });
  const prevStart = prevEnd.minus({ days: count - 1 });
  return { from: prevStart.toISODate()!, to: prevEnd.toISODate()! };
}

export function eachDayDescending(from: string, to: string): string[] {
  const start = parseDay(from);
  const end = parseDay(to);
  const days: string[] = [];
  for (let cursor = end; cursor >= start; cursor = cursor.minus({ days: 1 })) {
    days.push(cursor.toISODate()!);
  }
  return days;
}

export function saoPauloToday(now: Date = new Date()): string {
  return DateTime.fromJSDate(now, { zone: TRAFFIC_TIME_ZONE }).toISODate()!;
}

export function utcMidnight(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}
