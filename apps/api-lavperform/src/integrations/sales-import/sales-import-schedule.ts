export type SalesImportPartnerSlug =
  | 'vmlav'
  | 'agidez'
  | 'cicclo'
  | 'maxlav'
  | 'l2automate';

export function utcDateOnly(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function previousUtcDateOnly(now: Date = new Date()): string {
  const previous = new Date(now);
  previous.setUTCDate(previous.getUTCDate() - 1);
  return utcDateOnly(previous);
}

export function catchupDates(now: Date = new Date()): {
  today: string;
  yesterday: string;
} {
  return { today: utcDateOnly(now), yesterday: previousUtcDateOnly(now) };
}

export function salesImportSlot(now: Date = new Date()): string {
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = now.getUTCMinutes() < 30 ? '00' : '30';
  return `${hours}${minutes}`;
}

export function salesCatchupJobId(
  partner: SalesImportPartnerSlug,
  companyId: string,
  date: string,
  now: Date = new Date(),
): string {
  return `${partner}-import:${companyId}:${date}:${salesImportSlot(now)}`;
}

export function salesBackfill90JobId(
  partner: SalesImportPartnerSlug,
  companyId: string,
): string {
  return `${partner}-backfill-90:${companyId}`;
}

export function salesDailyImportJobId(
  partner: SalesImportPartnerSlug,
  companyId: string,
  date: string,
): string {
  return `${partner}-import:${companyId}:${date}`;
}
