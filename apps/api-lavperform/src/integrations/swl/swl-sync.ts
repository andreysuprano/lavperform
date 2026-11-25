import { DateTime } from 'luxon';

const SWL_ZONE = 'America/Sao_Paulo';
const MAX_WINDOW_DAYS = 31;
const WATERMARK_OVERLAP_MINUTES = 5;

export interface SwlWindow {
  dataInicio: string;
  dataFim: string;
}

/**
 * Divide o intervalo [startInclusive, endInclusive] em janelas de no máximo
 * 31 dias. `dataFim` é exclusivo e igual ao `dataInicio` da janela seguinte.
 */
export function swlHistoricalWindows(
  startInclusive: string,
  endInclusive: string,
): SwlWindow[] {
  const start = DateTime.fromISO(startInclusive, { zone: 'utc' }).startOf(
    'day',
  );
  const endExclusive = DateTime.fromISO(endInclusive, { zone: 'utc' })
    .startOf('day')
    .plus({ days: 1 });

  if (!start.isValid || !endExclusive.isValid) {
    throw new Error('Datas inválidas para as janelas históricas da SWL');
  }

  const windows: SwlWindow[] = [];
  let cursor = start;
  while (cursor < endExclusive) {
    const candidate = cursor.plus({ days: MAX_WINDOW_DAYS });
    const next = candidate < endExclusive ? candidate : endExclusive;
    windows.push({
      dataInicio: cursor.toISODate() as string,
      dataFim: next.toISODate() as string,
    });
    cursor = next;
  }
  return windows;
}

/** ISO com offset de São Paulo, 5 minutos antes do marco. */
export function swlWatermarkQuery(watermark: Date): string {
  return DateTime.fromJSDate(watermark, { zone: SWL_ZONE })
    .minus({ minutes: WATERMARK_OVERLAP_MINUTES })
    .toISO() as string;
}

/**
 * Maior instante válido entre os timestamps da SWL. Sem instante novo
 * (lista vazia, inválidos ou não posteriores), mantém o marco anterior.
 */
export function nextSwlWatermark(
  previous: Date | null,
  timestamps: string[],
): Date | null {
  let max: Date | null = null;
  for (const timestamp of timestamps) {
    const parsed = DateTime.fromISO(timestamp, { setZone: true });
    if (!parsed.isValid) continue;
    const date = parsed.toJSDate();
    if (!max || date > max) max = date;
  }
  if (!max) return previous;
  if (previous && max <= previous) return previous;
  return max;
}

/** Meia-noite em São Paulo da data informada (yyyy-MM-dd). */
export function emptyHistoricalWatermark(dataFim: string): Date {
  const date = DateTime.fromISO(dataFim, { zone: SWL_ZONE }).startOf('day');
  if (!date.isValid) {
    throw new Error('Data inválida para o marco histórico da SWL');
  }
  return date.toJSDate();
}
