import { DateTime } from 'luxon';

/**
 * Utilitários para manipulação de datas com tratamento de timezone
 * 
 * Problema: Quando usamos new Date() com strings sem timezone explícito,
 * o JavaScript interpreta como horário local, causando diferenças de 3h (UTC-3)
 * 
 * Solução: Sempre garantir que as datas sejam interpretadas como UTC
 */

/**
 * Converte uma string de data para Date garantindo interpretação UTC
 * 
 * @param dateString - String de data em formato ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss)
 * @returns Date object com timezone UTC
 * 
 * @example
 * // Sem o utilitário (ERRADO - adiciona 3h)
 * new Date('2024-01-15T10:30:00') // -> 2024-01-15T13:30:00.000Z
 * 
 * // Com o utilitário (CORRETO - mantém o horário)
 * parseUTCDate('2024-01-15T10:30:00') // -> 2024-01-15T10:30:00.000Z
 */
export function parseUTCDate(dateString: string | Date | null | undefined): Date | undefined {
  if (!dateString) {
    return undefined;
  }

  // Se já é um Date object, retorna como está
  if (dateString instanceof Date) {
    return dateString;
  }

  // Remove espaços extras
  const cleanDateString = dateString.trim();

  // Se já tem timezone explícito (Z ou +/-HH:mm), usa diretamente
  if (cleanDateString.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(cleanDateString)) {
    return new Date(cleanDateString);
  }

  // Se não tem timezone, adiciona Z para forçar interpretação UTC
  // Isso evita que o JavaScript interprete como horário local (UTC-3 em Brasília)
  const utcDateString = cleanDateString.includes('T')
    ? `${cleanDateString}Z`
    : `${cleanDateString}T00:00:00Z`;

  return new Date(utcDateString);
}

/**
 * Converte uma string de data para Date garantindo interpretação UTC
 * Versão que lança erro se a data for inválida ou nula
 * 
 * @param dateString - String de data em formato ISO
 * @returns Date object com timezone UTC
 * @throws Error se a data for nula ou inválida
 */
export function parseUTCDateStrict(dateString: string | Date): Date {
  if (!dateString) {
    throw new Error('Data é obrigatória');
  }

  const date = parseUTCDate(dateString);
  
  if (!date || isNaN(date.getTime())) {
    throw new Error(`Data inválida: ${dateString}`);
  }

  return date;
}

/**
 * Formata uma data para string no formato ISO 8601 UTC
 * 
 * @param date - Date object
 * @returns String no formato YYYY-MM-DDTHH:mm:ss.sssZ
 */
export function toUTCString(date: Date): string {
  return date.toISOString();
}

/**
 * Formata uma data para string no formato de data apenas (YYYY-MM-DD)
 * 
 * @param date - Date object ou string
 * @returns String no formato YYYY-MM-DD
 */
export function toDateOnlyString(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseUTCDate(date) : date;
  
  if (!dateObj) {
    throw new Error('Data inválida');
  }

  return dateObj.toISOString().split('T')[0];
}

/**
 * Obtém a data atual em UTC
 * 
 * @returns Date object representando agora em UTC
 */
export function nowUTC(): Date {
  return new Date();
}

/**
 * Cria uma data UTC a partir de componentes de data
 * 
 * @param year - Ano
 * @param month - Mês (1-12, não 0-11)
 * @param day - Dia
 * @param hour - Hora (opcional, padrão 0)
 * @param minute - Minuto (opcional, padrão 0)
 * @param second - Segundo (opcional, padrão 0)
 * @returns Date object em UTC
 */
export function createUTCDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

/**
 * Gera um horário aleatório dentro de um intervalo interpretando HH:mm no relógio UTC do dia de `baseDate`.
 * Para horários de funcionamento cadastrados como hora local do estabelecimento, use
 * `getRandomTimeInRangeForOpeningHours`.
 */
export function getRandomTimeInRange(
  openTime: string,
  closeTime: string,
  baseDate: Date = nowUTC(),
): Date {
  const [openHour, openMinute] = openTime.split(':').map(Number);
  const [closeHour, closeMinute] = closeTime.split(':').map(Number);

  // Converter tudo para minutos para facilitar o cálculo
  const openTimeInMinutes = openHour * 60 + openMinute;
  const closeTimeInMinutes = closeHour * 60 + closeMinute;

  // Gerar minutos aleatórios dentro do intervalo
  const randomMinutes = Math.floor(
    Math.random() * (closeTimeInMinutes - openTimeInMinutes) + openTimeInMinutes,
  );

  // Converter de volta para horas e minutos
  const randomHour = Math.floor(randomMinutes / 60);
  const randomMinute = randomMinutes % 60;

  // Criar nova data com o horário aleatório usando UTC
  const resultDate = new Date(baseDate);
  resultDate.setUTCHours(randomHour, randomMinute, 0, 0);

  return resultDate;
}

const DEFAULT_OPENING_HOURS_TIMEZONE = 'America/Sao_Paulo';

/**
 * Retorna o timezone de funcionamento configurado (default: America/Sao_Paulo).
 */
export function getOpeningHoursTimezone(): string {
  return process.env.OPENING_HOURS_TIMEZONE || DEFAULT_OPENING_HOURS_TIMEZONE;
}

/**
 * Início do dia (00:00:00.000) no fuso informado, convertido para UTC.
 * Exemplo: 18/05 00:00 SP → 18/05 03:00 UTC
 */
export function startOfDayInTz(date: Date = nowUTC(), timeZone: string = getOpeningHoursTimezone()): Date {
  return DateTime.fromJSDate(date, { zone: 'utc' })
    .setZone(timeZone)
    .startOf('day')
    .toUTC()
    .toJSDate();
}

/**
 * Fim do dia (23:59:59.999) no fuso informado, convertido para UTC.
 * Exemplo: 18/05 23:59:59.999 SP → 19/05 02:59:59.999 UTC
 */
export function endOfDayInTz(date: Date = nowUTC(), timeZone: string = getOpeningHoursTimezone()): Date {
  return DateTime.fromJSDate(date, { zone: 'utc' })
    .setZone(timeZone)
    .endOf('day')
    .toUTC()
    .toJSDate();
}

/**
 * Extrai YYYY-MM-DD de um input de campanha (date-only ou ISO).
 * Usa os primeiros 10 caracteres quando o valor começa com data ISO.
 */
export function extractCalendarDateString(input: string | Date): string {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return campaignCalendarDate(parsed);
    }
    throw new Error(`Data de campanha inválida: ${input}`);
  }

  return campaignCalendarDate(input);
}

/**
 * Dia civil de vigência da campanha (YYYY-MM-DD).
 *
 * - Meia-noite UTC exata (legado `T00:00:00.000Z`): usa a data UTC (date-only).
 * - Demais instantes (início/fim do dia em SP): usa o calendário no fuso do estabelecimento.
 */
export function campaignCalendarDate(
  date: Date | string,
  timeZone: string = getOpeningHoursTimezone(),
): string {
  const jsDate = typeof date === 'string' ? new Date(date) : date;
  const dt = DateTime.fromJSDate(jsDate, { zone: 'utc' });

  if (
    dt.hour === 0 &&
    dt.minute === 0 &&
    dt.second === 0 &&
    dt.millisecond === 0
  ) {
    return dt.toISODate()!;
  }

  return dt.setZone(timeZone).toISODate()!;
}

/**
 * Início do dia civil da campanha no fuso do estabelecimento (UTC instant).
 */
export function parseCampaignStartDate(
  input: string | Date,
  timeZone: string = getOpeningHoursTimezone(),
): Date {
  const calendar = extractCalendarDateString(input);
  return DateTime.fromISO(calendar, { zone: timeZone }).startOf('day').toUTC().toJSDate();
}

/**
 * Fim do dia civil da campanha no fuso do estabelecimento (UTC instant).
 */
export function parseCampaignEndDate(
  input: string | Date,
  timeZone: string = getOpeningHoursTimezone(),
): Date {
  const calendar = extractCalendarDateString(input);
  return DateTime.fromISO(calendar, { zone: timeZone }).endOf('day').toUTC().toJSDate();
}

/**
 * Limite inferior inclusivo para filtrar endDate ainda válido "hoje" em SP.
 * Compatível com legado (meia-noite UTC da data civil) e novo (fim do dia SP).
 */
export function campaignEndDateMinInclusive(
  now: Date = nowUTC(),
  timeZone: string = getOpeningHoursTimezone(),
): Date {
  const todaySp = DateTime.fromJSDate(now, { zone: 'utc' }).setZone(timeZone).toISODate()!;
  return new Date(`${todaySp}T00:00:00.000Z`);
}

/**
 * Horário aleatório entre abertura e fechamento no fuso do estabelecimento.
 * Os horários do cadastro são relógio local (não UTC). O retorno é instante UTC para o banco/cron.
 * Fechamento antes da abertura no mesmo dia (ex.: 22:00–02:00) estende o fechamento para o dia seguinte.
 *
 * @param timeZone - IANA, por padrão `OPENING_HOURS_TIMEZONE` ou America/Sao_Paulo.
 */
export function getRandomTimeInRangeForOpeningHours(
  openTime: string,
  closeTime: string,
  baseDate: Date = nowUTC(),
  timeZone: string = process.env.OPENING_HOURS_TIMEZONE || DEFAULT_OPENING_HOURS_TIMEZONE,
): Date {
  const base = DateTime.fromJSDate(baseDate, { zone: 'utc' }).setZone(timeZone);
  const [openHour, openMinute] = openTime.split(':').map(Number);
  const [closeHour, closeMinute] = closeTime.split(':').map(Number);

  const start = base.set({ hour: openHour, minute: openMinute, second: 0, millisecond: 0 });
  let end = base.set({ hour: closeHour, minute: closeMinute, second: 0, millisecond: 0 });

  let endMs = end.toMillis();
  const startMs = start.toMillis();
  if (endMs <= startMs) {
    end = end.plus({ days: 1 });
    endMs = end.toMillis();
  }

  // Piso "agora + 1min": evita gerar `scheduledDate` no passado quando a
  // campanha é processada/reprocessada DENTRO do horário comercial (ex:
  // edição de campanha às 19:00 com horário comercial 09:00–22:00, que
  // antes podia gerar mensagens para 14:00 — nunca enviadas pelo cron).
  const minMs = baseDate.getTime() + 60_000;
  const effectiveStartMs = Math.max(startMs, minMs);

  // Se já passou de TODO o horário comercial, agenda para o piso (o cron
  // de envio com janela "look-ahead" pega na próxima iteração).
  if (effectiveStartMs >= endMs) {
    return new Date(minMs);
  }

  const randomMs =
    effectiveStartMs + Math.floor(Math.random() * (endMs - effectiveStartMs));
  return DateTime.fromMillis(randomMs, { zone: timeZone }).toUTC().toJSDate();
}

/**
 * Horário fixo no fuso do estabelecimento.
 * Se o horário alvo já passou, retorna agora + 1 min (mesmo piso do agendamento aleatório).
 */
export function getFixedTimeInRange(
  fixedTime: string,
  baseDate: Date = nowUTC(),
  timeZone: string = process.env.OPENING_HOURS_TIMEZONE || DEFAULT_OPENING_HOURS_TIMEZONE,
): Date {
  const base = DateTime.fromJSDate(baseDate, { zone: 'utc' }).setZone(timeZone);
  const [hour, minute] = fixedTime.split(':').map(Number);
  const target = base.set({ hour, minute, second: 0, millisecond: 0 });
  const minMs = baseDate.getTime() + 60_000;
  const targetMs = target.toMillis();

  if (targetMs >= minMs) {
    return DateTime.fromMillis(targetMs, { zone: timeZone }).toUTC().toJSDate();
  }

  return new Date(minMs);
}

/**
 * Obtém o dia da semana em português brasileiro (abreviado) no fuso do estabelecimento.
 *
 * Usa o fuso `OPENING_HOURS_TIMEZONE` (default: America/Sao_Paulo) para que o
 * "dia de hoje" seja sempre o dia local do estabelecimento, mesmo quando o servidor
 * já avançou para o dia seguinte em UTC (ex.: 21:01 SP = 00:01 UTC+1day).
 *
 * @param date - Date object (padrão: agora em UTC)
 * @param timeZone - fuso IANA (padrão: getOpeningHoursTimezone())
 * @returns String com dia da semana: 'dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'
 */
export function getDayOfWeekPtBr(
  date: Date = nowUTC(),
  timeZone: string = getOpeningHoursTimezone(),
): string {
  const daysOfWeek = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const localDow = DateTime.fromJSDate(date, { zone: 'utc' }).setZone(timeZone).weekday % 7;
  return daysOfWeek[localDow];
}

/**
 * Formata uma data para string ISO 8601
 * 
 * @param date - Date object
 * @returns String no formato ISO (YYYY-MM-DDTHH:mm:ss.sssZ)
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

