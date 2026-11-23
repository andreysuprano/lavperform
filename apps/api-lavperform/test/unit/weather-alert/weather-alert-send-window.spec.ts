import {
  isWithinWeatherAlertSendWindow,
} from 'src/weather-alert/domain/weather-alert-send-window';

describe('isWithinWeatherAlertSendWindow', () => {
  const zone = 'America/Sao_Paulo';

  it('bloqueia à meia-noite em SP', () => {
    // 2024-06-15 00:00 SP = 2024-06-15 03:00 UTC
    expect(
      isWithinWeatherAlertSendWindow(
        new Date('2024-06-15T03:00:00.000Z'),
        zone,
      ),
    ).toBe(false);
  });

  it('bloqueia às 07:30 em SP', () => {
    // 2024-06-15 07:30 SP = 2024-06-15 10:30 UTC
    expect(
      isWithinWeatherAlertSendWindow(
        new Date('2024-06-15T10:30:00.000Z'),
        zone,
      ),
    ).toBe(false);
  });

  it('permite às 08:00 em SP', () => {
    // 2024-06-15 08:00 SP = 2024-06-15 11:00 UTC
    expect(
      isWithinWeatherAlertSendWindow(
        new Date('2024-06-15T11:00:00.000Z'),
        zone,
      ),
    ).toBe(true);
  });

  it('permite às 17:30 em SP', () => {
    // 2024-06-15 17:30 SP = 2024-06-15 20:30 UTC
    expect(
      isWithinWeatherAlertSendWindow(
        new Date('2024-06-15T20:30:00.000Z'),
        zone,
      ),
    ).toBe(true);
  });

  it('bloqueia às 18:00 em SP', () => {
    // 2024-06-15 18:00 SP = 2024-06-15 21:00 UTC
    expect(
      isWithinWeatherAlertSendWindow(
        new Date('2024-06-15T21:00:00.000Z'),
        zone,
      ),
    ).toBe(false);
  });
});