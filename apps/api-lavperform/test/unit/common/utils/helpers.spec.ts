import { formatDate, getDayOfWeekPtBr, getRandomTimeInRange, getRandomTimeInRangeForOpeningHours, startOfDayInTz, endOfDayInTz } from 'src/common/utils/date.utils';
import { generateUniqueToken } from 'src/common/utils/generateUniqueToken';
import { getRandomArbitrary } from 'src/common/utils/randomArbitrary';
import { slugfy } from 'src/common/utils/slugfy';

describe('Common utils', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('formats date subtracting 3 hours and returns ISO string', () => {
    const date = new Date('2024-01-01T03:00:00.000Z');
    const formatted = formatDate(date);

    expect(formatted).toBe('2024-01-01T03:00:00.000Z');
  });

  it('returns weekday in pt-BR abbreviation', () => {
    const monday = new Date(Date.UTC(2024, 0, 1, 12, 0, 0)); // Monday at midday to avoid TZ drift
    expect(getDayOfWeekPtBr(monday)).toBe('seg');
  });

  it('getDayOfWeekPtBr retorna o dia correto no fuso SP quando UTC já avançou para o dia seguinte', () => {
    // 2024-01-07 é domingo. Às 21:30 SP = 2024-01-08 00:30 UTC (segunda)
    const sundayNightSp = new Date('2024-01-08T00:30:00.000Z');
    expect(getDayOfWeekPtBr(sundayNightSp, 'America/Sao_Paulo')).toBe('dom');
    // Em UTC seria segunda-feira
    expect(getDayOfWeekPtBr(sundayNightSp, 'UTC')).toBe('seg');
  });

  it('startOfDayInTz retorna 00:00 local convertido para UTC', () => {
    // 2024-06-15 12:00 UTC = 09:00 SP; início do dia SP = 00:00 SP = 03:00 UTC
    const result = startOfDayInTz(new Date('2024-06-15T12:00:00.000Z'), 'America/Sao_Paulo');
    expect(result.toISOString()).toBe('2024-06-15T03:00:00.000Z');
  });

  it('endOfDayInTz retorna 23:59:59.999 local convertido para UTC', () => {
    // 2024-06-15 12:00 UTC = 09:00 SP; fim do dia SP = 23:59:59.999 SP = 02:59:59.999 UTC+1day
    const result = endOfDayInTz(new Date('2024-06-15T12:00:00.000Z'), 'America/Sao_Paulo');
    expect(result.toISOString()).toBe('2024-06-16T02:59:59.999Z');
  });

  it('startOfDayInTz: quando UTC está no dia seguinte, ainda captura o início do dia local correto', () => {
    // 2024-01-08 00:30 UTC = 2024-01-07 21:30 SP → início do dia SP deve ser 2024-01-07
    const result = startOfDayInTz(new Date('2024-01-08T00:30:00.000Z'), 'America/Sao_Paulo');
    // 2024-01-07 00:00 SP = 2024-01-07 03:00 UTC
    expect(result.toISOString()).toBe('2024-01-07T03:00:00.000Z');
  });

  it('returns random opening-hours time in local zone as UTC instant', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const result = getRandomTimeInRangeForOpeningHours(
      '10:00',
      '18:00',
      new Date('2024-06-15T12:00:00.000Z'),
      'America/Sao_Paulo',
    );
    // 2024-06-15 10:00 America/Sao_Paulo → 13:00 UTC
    expect(result.toISOString()).toBe('2024-06-15T13:00:00.000Z');
  });

  it('returns random time within range using Math.random', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = getRandomTimeInRange('10:00', '11:00', new Date('2024-01-01T00:00:00.000Z'));

    expect(result.getUTCHours()).toBe(10);
    expect(result.getUTCMinutes()).toBe(30);
  });

  it('generates deterministic 6-char token for uuids', () => {
    expect(generateUniqueToken('a', 'b')).toBe('34FAFD');
  });

  it('includes optional salt so each message can get a distinct 6-char token', () => {
    expect(generateUniqueToken('a', 'b', 'salt-one')).not.toBe(generateUniqueToken('a', 'b'));
    expect(generateUniqueToken('a', 'b', 'salt-one')).toHaveLength(6);
    expect(generateUniqueToken('a', 'b', 'salt-one')).toMatch(/^[0-9A-F]{6}$/);
  });

  it('slugfies text by lowering, replacing spaces and removing specials', () => {
    expect(slugfy('Hello World!')).toBe('hello-world');
  });

  it('returns integer inside range for getRandomArbitrary', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.75);
    expect(getRandomArbitrary(1, 5)).toBe(4);
  });
});
