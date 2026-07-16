import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsBoolean, IsDateString, IsNumber, Min, Max, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AutomaticCampaignStatus, AutomaticCampaignType, CampaignChannel } from '@prisma/client';

export class AutomaticCampaignAdminFilterDto {
  @ApiProperty({ description: 'Página', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Itens por página', required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({ description: 'Campo para ordenação', required: false, default: 'createdAt' })
  @IsOptional()
  @IsString()
  orderBy?: string = 'createdAt';

  @ApiProperty({ description: 'Direção da ordenação', required: false, enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  orderDirection?: 'asc' | 'desc' = 'desc';

  @ApiProperty({ description: 'ID da empresa', required: false })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ description: 'Busca parcial pelo nome da campanha', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Filtrar por tipo', required: false, enum: AutomaticCampaignType })
  @IsOptional()
  @IsEnum(AutomaticCampaignType)
  type?: AutomaticCampaignType;

  @ApiProperty({ description: 'Filtrar por status', required: false, enum: AutomaticCampaignStatus })
  @IsOptional()
  @IsEnum(AutomaticCampaignStatus)
  status?: AutomaticCampaignStatus;

  @ApiProperty({ description: 'Filtrar por canal', required: false, enum: CampaignChannel })
  @IsOptional()
  @IsEnum(CampaignChannel)
  channel?: CampaignChannel;

  @ApiProperty({ description: 'Filtrar por campanha ativa/inativa', required: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ description: 'Data inicial (startDate)', required: false, example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'Data final (startDate)', required: false, example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Filtrar por deleted (soft delete)', required: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  deleted?: boolean;
}
