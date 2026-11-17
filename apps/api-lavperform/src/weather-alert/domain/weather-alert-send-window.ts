import { DateTime } from 'luxon';
import { getOpeningHoursTimezone, nowUTC } from '../../common/utils/date.utils';

/** Início da janela de envio (hora local do estabelecimento, inclusivo). */
export const WEATHER_ALERT_SEND_START_HOUR = 8;

/** Fim da janela (hora local exclusiva): último envio até 19:59. */
export const WEATHER_ALERT_SEND_END_HOUR_EXCLUSIVE = 20;

/**
 * Verifica se o instante atual está dentro da janela global de envio dos alertas climáticos.
 */
export function isWithinWeatherAlertSendWindow(
  now: Date = nowUTC(),
  timeZone: string = getOpeningHoursTimezone(),
): boolean {
  const local = DateTime.fromJSDate(now, { zone: 'utc' }).setZone(timeZone);
  const totalMinutes = local.hour * 60 + local.minute;
  const start = WEATHER_ALERT_SEND_START_HOUR * 60;
  const end = WEATHER_ALERT_SEND_END_HOUR_EXCLUSIVE * 60;
  return totalMinutes >= start && totalMinutes < end;
}