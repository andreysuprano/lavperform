import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsBoolean, IsEnum } from 'class-validator';
import { AutomaticCampaignType } from '@prisma/client';
import { Type } from 'class-transformer';

export class AutomaticCampaignFilterDto {
  @ApiProperty({
    description: 'Data inicial para filtro de campanhas',
    example: '2024-01-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @ApiProperty({
    description: 'Data final para filtro de campanhas',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: Date;

  @ApiProperty({
    description: 'Filtrar apenas campanhas ativas',
    example: true,
    required: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    description: 'Tipo da campanha automática',
    example: 'REACTIVATION',
    enum: AutomaticCampaignType,
    required: false,
  })
  @IsOptional()
  @IsEnum(AutomaticCampaignType)
  type?: AutomaticCampaignType;
}
