import { DateTime } from 'luxon';

export const SCHEDULE_ZONE = 'America/Sao_Paulo';

export type ScheduleSlot = {
  id: string;
  label: string;
  at: string;
  best: boolean;
};

function nextWeekday(
  now: DateTime,
  weekday: number,
  hour: number,
  minute: number,
): DateTime {
  const days = (weekday - now.weekday + 7) % 7;
  let candidate = now
    .set({ hour, minute, second: 0, millisecond: 0 })
    .plus({ days });
  if (candidate <= now) candidate = candidate.plus({ weeks: 1 });
  return candidate;
}

export function suggestSlots(
  now = DateTime.now().setZone(SCHEDULE_ZONE),
): ScheduleSlot[] {
  const zoned = now.setZone(SCHEDULE_ZONE);
  const tomorrow = zoned
    .plus({ days: 1 })
    .set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
  const friday = nextWeekday(zoned, 5, 18, 30);
  const saturday = nextWeekday(zoned, 6, 10, 0);
  return [
    {
      id: 'tomorrow-9',
      label: 'Amanhã 9:00',
      at: tomorrow.toUTC().toISO() ?? tomorrow.toISO() ?? '',
      best: false,
    },
    {
      id: 'friday-1830',
      label: 'Sex 18:30 · melhor horário',
      at: friday.toUTC().toISO() ?? friday.toISO() ?? '',
      best: true,
    },
    {
      id: 'saturday-10',
      label: 'Sáb 10:00',
      at: saturday.toUTC().toISO() ?? saturday.toISO() ?? '',
      best: false,
    },
  ];
}
