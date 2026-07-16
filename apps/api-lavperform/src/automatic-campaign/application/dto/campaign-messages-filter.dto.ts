import { ApiProperty } from '@nestjs/swagger';
import { BadRequestException } from '@nestjs/common';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { MessageStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { parseUTCDate } from '../../../common/utils/date.utils';
import {
  ALL_RFV_CLASSIFICATIONS,
  ClientTypes,
} from '../../../common/utils/rfvClassification';

const toStringArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map((v) => String(v));
      } catch {
        // fallthrough
      }
    }
    return trimmed
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }
  return [String(value)];
};

export class CampaignMessagesFilterDto extends PaginationDto {
  @ApiProperty({
    description:
      'Data inicial (inclusiva) no formato ISO 8601 (YYYY-MM-DD). Se omitida junto com endDate, utiliza o dia atual.',
    required: false,
    example: '2026-04-01',
  })
  @IsOptional()
  @IsDateString()
  declare startDate?: string;

  @ApiProperty({
    description:
      'Data final (inclusiva) no formato ISO 8601 (YYYY-MM-DD). Se omitida junto com startDate, utiliza o dia atual.',
    required: false,
    example: '2026-04-30',
  })
  @IsOptional()
  @IsDateString()
  declare endDate?: string;

  @ApiProperty({
    description:
      'Filtrar por classificação RFV (segmentação da mensagem). Pode ser múltiplas. Se não informado, retorna todas.',
    required: false,
    isArray: true,
    type: [String],
    enum: ALL_RFV_CLASSIFICATIONS,
    example: ['campeao', 'fiel'],
  })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  rfvClassification?: string[];

  @ApiProperty({
    description:
      'Filtrar por status da mensagem. Pode ser múltiplos. Se não informado, retorna todos.',
    required: false,
    isArray: true,
    enum: MessageStatus,
    example: [MessageStatus.SENT, MessageStatus.PENDING],
  })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsEnum(MessageStatus, { each: true })
  status?: MessageStatus[];
}

export interface ResolvedCampaignMessagesFilter {
  startDate: Date;
  endDate: Date;
  rfvClassification?: string[];
  status?: MessageStatus[];
  page: number;
  limit: number;
  orderBy: string;
  orderDirection: 'asc' | 'desc';
}

/**
 * Resolve os filtros do endpoint de mensagens de campanha.
 *
 * Regras:
 * - startDate e endDate: se ambos ausentes, assume o dia atual (00:00 → 23:59 UTC).
 *   Se apenas um vier, lança BadRequestException.
 * - rfvClassification: se vazio/ausente, não filtra (retorna todos).
 * - status: se vazio/ausente, não filtra (retorna todos).
 */
export function resolveCampaignMessagesFilter(
  dto: CampaignMessagesFilterDto | undefined,
): ResolvedCampaignMessagesFilter {
  const startRaw = dto?.startDate;
  const endRaw = dto?.endDate;

  const hasStart = startRaw !== undefined && startRaw !== null && startRaw !== '';
  const hasEnd = endRaw !== undefined && endRaw !== null && endRaw !== '';

  if (hasStart !== hasEnd) {
    throw new BadRequestException('startDate e endDate devem ser enviados juntos');
  }

  let startDate: Date;
  let endDate: Date;

  if (hasStart && hasEnd) {
    const parsedStart = parseUTCDate(startRaw);
    const parsedEnd = parseUTCDate(endRaw);

    if (!parsedStart || isNaN(parsedStart.getTime())) {
      throw new BadRequestException('startDate inválido');
    }
    if (!parsedEnd || isNaN(parsedEnd.getTime())) {
      throw new BadRequestException('endDate inválido');
    }

    parsedStart.setUTCHours(0, 0, 0, 0);
    parsedEnd.setUTCHours(23, 59, 59, 999);

    if (parsedEnd.getTime() < parsedStart.getTime()) {
      throw new BadRequestException('endDate deve ser maior ou igual a startDate');
    }

    startDate = parsedStart;
    endDate = parsedEnd;
  } else {
    // Default: hoje (UTC)
    const today = new Date();
    startDate = new Date(today);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate = new Date(today);
    endDate.setUTCHours(23, 59, 59, 999);
  }

  const rfvClassification =
    dto?.rfvClassification && dto.rfvClassification.length > 0
      ? dto.rfvClassification
      : undefined;

  const status =
    dto?.status && dto.status.length > 0 ? dto.status : undefined;

  return {
    startDate,
    endDate,
    rfvClassification,
    status,
    page: dto?.page ?? 1,
    limit: dto?.limit ?? 100,
    orderBy: dto?.orderBy ?? 'createdAt',
    orderDirection: dto?.orderDirection ?? 'desc',
  };
}

// Re-export para consumidores (mantém API coesa)
export { ClientTypes };
