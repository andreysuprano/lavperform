import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';
import {
  eachDayDescending,
  previousTrafficPeriod,
  resolveTrafficPeriod,
} from 'src/traffic/domain/traffic-period';

const now = DateTime.fromISO('2026-10-26T15:00:00', {
  zone: 'America/Sao_Paulo',
}).toJSDate();

describe('resolveTrafficPeriod', () => {
  it('usa hoje e os 29 dias anteriores quando as datas não vêm', () => {
    expect(resolveTrafficPeriod(undefined, undefined, now)).toEqual({
      from: '2026-09-27',
      to: '2026-10-26',
    });
  });

  it('aceita 90 dias inclusive', () => {
    expect(resolveTrafficPeriod('2026-01-01', '2026-03-31', now)).toEqual({
      from: '2026-01-01',
      to: '2026-03-31',
    });
  });

  it('rejeita 91 dias, data invertida e 31 de fevereiro', () => {
    expect(() => resolveTrafficPeriod('2026-01-01', '2026-04-01', now)).toThrow(
      new BadRequestException('O intervalo máximo é de 90 dias.'),
    );
    expect(() => resolveTrafficPeriod('2026-02-02', '2026-02-01', now)).toThrow(
      new BadRequestException('A data inicial é posterior à data final.'),
    );
    expect(() => resolveTrafficPeriod('2026-02-31', '2026-03-01', now)).toThrow(
      new BadRequestException('Informe as datas no formato aaaa-mm-dd.'),
    );
  });

  it('trata um único extremo como string vazia', () => {
    expect(() => resolveTrafficPeriod('2026-10-01', undefined, now)).toThrow(
      new BadRequestException('Informe as datas no formato aaaa-mm-dd.'),
    );
  });
});

describe('previousTrafficPeriod', () => {
  it('termina no dia anterior e tem a mesma duração', () => {
    expect(
      previousTrafficPeriod({ from: '2026-10-20', to: '2026-10-26' }),
    ).toEqual({ from: '2026-10-13', to: '2026-10-19' });
  });
});

describe('eachDayDescending', () => {
  it('vai do mais novo ao mais antigo', () => {
    expect(eachDayDescending('2026-10-24', '2026-10-26')).toEqual([
      '2026-10-26',
      '2026-10-25',
      '2026-10-24',
    ]);
  });
});
