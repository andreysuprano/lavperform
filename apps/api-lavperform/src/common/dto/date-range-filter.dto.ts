import { ApiProperty } from '@nestjs/swagger';
import { BadRequestException } from '@nestjs/common';
import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { DateTime } from 'luxon';
import { DateFilter } from '../utils/dateFilter';
import {
  endOfDayInTz,
  getOpeningHoursTimezone,
  parseUTCDate,
  startOfDayInTz,
} from '../utils/date.utils';

export class DateRangeFilterDto {
  @ApiProperty({
    description:
      'Filtro pré-definido em dias (usado apenas quando startDate/endDate não são enviados). Valores aceitos: 7, 14, 30.',
    required: false,
    enum: DateFilter,
  })
  @IsOptional()
  @Type(() => Number)
  @IsEnum(DateFilter)
  dateFilter?: DateFilter;

  @ApiProperty({
    description:
      'Data inicial (inclusiva) no formato ISO 8601. Deve ser enviada em conjunto com endDate.',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description:
      'Data final (inclusiva) no formato ISO 8601. Deve ser enviada em conjunto com startDate.',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export interface ResolvedDateRange {
  startDate: Date;
  endDate: Date;
  timeZone: string;
}

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function resolveDateBoundary(
  value: string | Date,
  timeZone: string,
  boundary: 'start' | 'end',
): Date | undefined {
  if (value instanceof Date) {
    return boundary === 'start'
      ? startOfDayInTz(value, timeZone)
      : endOfDayInTz(value, timeZone);
  }

  const cleanValue = value.trim();
  const parsedDate = parseUTCDate(cleanValue);

  if (!parsedDate || isNaN(parsedDate.getTime())) {
    return undefined;
  }

  const localDate = DATE_ONLY_REGEX.test(cleanValue)
    ? DateTime.fromISO(cleanValue, { zone: timeZone })
    : DateTime.fromJSDate(parsedDate, { zone: 'utc' }).setZone(timeZone);

  if (!localDate.isValid) {
    return undefined;
  }

  return (boundary === 'start' ? localDate.startOf('day') : localDate.endOf('day'))
    .toUTC()
    .toJSDate();
}

/**
 * Resolve o intervalo de datas efetivo a partir do DTO.
 *
 * Regras:
 * - Se startDate e endDate estiverem presentes, usa o intervalo customizado.
 * - Se apenas um dos dois vier, lança BadRequestException.
 * - Se nenhum vier, usa dateFilter (enum) como "últimos N dias" até hoje.
 * - Se dateFilter também não vier, usa DateFilter.LAST_7_DAYS.
 *
 * O horário do endDate é normalizado para o fim do dia no fuso do estabelecimento.
 * O horário do startDate é normalizado para o início do dia no fuso do estabelecimento.
 */
export function resolveDateRange(dto: DateRangeFilterDto | undefined): ResolvedDateRange {
  const timeZone = getOpeningHoursTimezone();
  const startDateRaw = dto?.startDate;
  const endDateRaw = dto?.endDate;

  const hasStart = startDateRaw !== undefined && startDateRaw !== null && startDateRaw !== '';
  const hasEnd = endDateRaw !== undefined && endDateRaw !== null && endDateRaw !== '';

  if (hasStart !== hasEnd) {
    throw new BadRequestException('startDate e endDate devem ser enviados juntos');
  }

  if (hasStart && hasEnd) {
    const startDate = resolveDateBoundary(startDateRaw, timeZone, 'start');
    const endDate = resolveDateBoundary(endDateRaw, timeZone, 'end');

    if (!startDate || isNaN(startDate.getTime())) {
      throw new BadRequestException('startDate inválido');
    }
    if (!endDate || isNaN(endDate.getTime())) {
      throw new BadRequestException('endDate inválido');
    }

    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException('endDate deve ser maior ou igual a startDate');
    }

    return { startDate, endDate, timeZone };
  }

  const days = Number(dto?.dateFilter) || DateFilter.LAST_7_DAYS;
  const endDate = endOfDayInTz(undefined, timeZone);
  const startReferenceDate = DateTime.fromJSDate(endDate, { zone: 'utc' })
    .setZone(timeZone)
    .minus({ days: days - 1 })
    .toJSDate();
  const startDate = startOfDayInTz(startReferenceDate, timeZone);

  return { startDate, endDate, timeZone };
}
