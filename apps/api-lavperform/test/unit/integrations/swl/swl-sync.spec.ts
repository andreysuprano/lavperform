import { DateTime } from 'luxon';
import {
  emptyHistoricalWatermark,
  nextSwlWatermark,
  swlHistoricalWindows,
  swlWatermarkQuery,
} from 'src/integrations/swl/swl-sync';

const days = (a: string, b: string) =>
  DateTime.fromISO(b, { zone: 'utc' }).diff(
    DateTime.fromISO(a, { zone: 'utc' }),
    'days',
  ).days;

describe('swlHistoricalWindows', () => {
  it('cobre 2026-01-01 a 2026-04-01 inclusive com dataFim exclusivo', () => {
    const windows = swlHistoricalWindows('2026-01-01', '2026-04-01');

    expect(windows[0].dataInicio).toBe('2026-01-01');
    expect(windows[windows.length - 1].dataFim).toBe('2026-04-02');
  });

  it('usa janelas de no máximo 31 dias, sem buraco e sem sobreposição', () => {
    const windows = swlHistoricalWindows('2026-01-01', '2026-04-01');

    expect(windows.length).toBeGreaterThan(1);
    windows.forEach((w, i) => {
      const span = days(w.dataInicio, w.dataFim);
      expect(span).toBeGreaterThan(0);
      expect(span).toBeLessThanOrEqual(31);
      if (i > 0) expect(w.dataInicio).toBe(windows[i - 1].dataFim);
    });
  });

  it('gera uma única janela para um único dia', () => {
    expect(swlHistoricalWindows('2026-03-10', '2026-03-10')).toEqual([
      { dataInicio: '2026-03-10', dataFim: '2026-03-11' },
    ]);
  });

  it('devolve vazio quando o fim é anterior ao início', () => {
    expect(swlHistoricalWindows('2026-03-10', '2026-03-09')).toEqual([]);
  });
});

describe('swlWatermarkQuery', () => {
  it('usa offset de São Paulo e 5 minutos antes do marco', () => {
    const query = swlWatermarkQuery(new Date('2026-11-06T12:55:00.000Z'));

    expect(query).toContain('-03:00');
    expect(query).toBe('2026-11-06T09:50:00.000-03:00');
  });
});

describe('nextSwlWatermark', () => {
  const previous = new Date('2026-11-06T10:00:00.000Z');

  it('mantém o marco anterior com lista vazia', () => {
    expect(nextSwlWatermark(previous, [])).toBe(previous);
    expect(nextSwlWatermark(null, [])).toBeNull();
  });

  it('grava o instante da SWL quando é novo', () => {
    const next = nextSwlWatermark(previous, [
      '2026-11-06T09:55:00.123456-03:00',
    ]);

    expect(next?.toISOString()).toBe('2026-11-06T12:55:00.123Z');
  });

  it('usa o maior instante válido e ignora inválidos', () => {
    const next = nextSwlWatermark(null, [
      '2026-11-06T09:00:00-03:00',
      'lixo',
      '2026-11-06T11:00:00-03:00',
    ]);

    expect(next?.toISOString()).toBe('2026-11-06T14:00:00.000Z');
  });

  it('não regride o marco quando os instantes são antigos', () => {
    expect(nextSwlWatermark(previous, ['2026-11-06T01:00:00-03:00'])).toBe(
      previous,
    );
  });
});

describe('emptyHistoricalWatermark', () => {
  it('devolve a meia-noite de São Paulo da data', () => {
    expect(emptyHistoricalWatermark('2026-04-02').toISOString()).toBe(
      '2026-04-02T03:00:00.000Z',
    );
  });
});
