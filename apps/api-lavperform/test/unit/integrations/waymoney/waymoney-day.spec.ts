import {
  waymoneyCatchupDates,
  waymoneyDayRange,
} from 'src/integrations/waymoney/waymoney-day';
import {
  WAYMONEY_AUTH_BLOCK_TTL_SECONDS,
  waymoneyAuthBlockKey,
} from 'src/integrations/waymoney/waymoney-auth-block';

const SAO_PAULO_DAY = {
  startDate: '2026-11-09T03:00:00.000Z',
  endDate: '2026-11-10T02:59:59.999Z',
};

describe('waymoneyDayRange', () => {
  it('abre 2026-11-09 em America/Sao_Paulo de meia-noite até 23:59:59.999', () => {
    expect(waymoneyDayRange('2026-11-09', 'America/Sao_Paulo')).toEqual(
      SAO_PAULO_DAY,
    );
  });

  it('usa America/Sao_Paulo quando o fuso vem vazio', () => {
    expect(waymoneyDayRange('2026-11-09')).toEqual(SAO_PAULO_DAY);
    expect(waymoneyDayRange('2026-11-09', null)).toEqual(SAO_PAULO_DAY);
    expect(waymoneyDayRange('2026-11-09', '')).toEqual(SAO_PAULO_DAY);
    expect(waymoneyDayRange('2026-11-09', '   ')).toEqual(SAO_PAULO_DAY);
  });

  it('respeita um fuso explícito diferente', () => {
    expect(waymoneyDayRange('2026-11-09', 'UTC')).toEqual({
      startDate: '2026-11-09T00:00:00.000Z',
      endDate: '2026-11-09T23:59:59.999Z',
    });
  });
});

describe('waymoneyCatchupDates', () => {
  it('usa o dia civil de America/Sao_Paulo', () => {
    expect(
      waymoneyCatchupDates(new Date('2026-11-09T15:00:00.000Z')),
    ).toEqual({
      today: '2026-11-09',
      yesterday: '2026-11-08',
    });
  });

  it('ainda está no dia anterior em São Paulo antes das 03:00 UTC', () => {
    expect(
      waymoneyCatchupDates(new Date('2026-11-09T02:30:00.000Z')),
    ).toEqual({
      today: '2026-11-08',
      yesterday: '2026-11-07',
    });
  });
});

describe('waymoneyAuthBlockKey', () => {
  it('bloqueia a empresa por 12 horas', () => {
    expect(WAYMONEY_AUTH_BLOCK_TTL_SECONDS).toBe(12 * 60 * 60);
    expect(waymoneyAuthBlockKey('company-1')).toBe(
      'waymoney:auth-blocked:company-1',
    );
  });
});
