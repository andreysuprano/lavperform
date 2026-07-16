import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, Min } from 'class-validator';
import { CampaignChannel, CampaignStatus } from '@prisma/client';

export class UpdateCampaignAdminDto {
  @ApiProperty({ description: 'Nome da campanha', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Data agendada para envio (ISO 8601)', required: false, example: '2024-12-25T10:00:00Z' })
  @IsOptional()
  @IsString()
  scheduledDate?: string;

  @ApiProperty({ description: 'Texto da mensagem', required: false })
  @IsOptional()
  @IsString()
  messageText?: string;

  @ApiProperty({ description: 'Segmentação dos clientes', required: false })
  @IsOptional()
  @IsString()
  segmentation?: string;

  @ApiProperty({ description: 'Máximo de envios por dia', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxDailySends?: number;

  @ApiProperty({ description: 'URL da imagem', required: false, nullable: true })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ description: 'Modificado por IA', required: false })
  @IsOptional()
  @IsBoolean()
  modifiedByAI?: boolean;

  @ApiProperty({ description: 'Canal de envio', required: false, enum: CampaignChannel })
  @IsOptional()
  @IsEnum(CampaignChannel)
  channel?: CampaignChannel;

  @ApiProperty({ description: 'Status da campanha', required: false, enum: CampaignStatus })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiProperty({ description: 'Código de rastreamento', required: false, nullable: true })
  @IsOptional()
  @IsString()
  trakingCode?: string;

  @ApiProperty({ description: 'ID da empresa (mover campanha de empresa)', required: false })
  @IsOptional()
  @IsString()
  companyId?: string;
}
