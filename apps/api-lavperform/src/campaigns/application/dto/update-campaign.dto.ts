import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, IsInt, Min, ValidateIf, IsUUID } from 'class-validator';
import { AudienceTargetingMode, CampaignStatus } from '@prisma/client';

export class UpdateCampaignDto {
  @ApiProperty({
    description: 'Nome da campanha',
    example: 'Campanha de Black Friday',
    required: true,
  })
  @IsString()
  @IsOptional()
  name: string;

  @IsOptional()

  @ApiProperty({
    description: 'Data agendada para envio',
    example: '2024-12-25T10:00:00Z',
    required: true,
  })
  @IsString()
  scheduledDate: string;

  @ApiProperty({
    description: 'Texto da mensagem',
    example: 'Aproveite nossas ofertas de Black Friday!',
    required: true,
  })
  @IsString()
  @IsOptional()
  messageText: string;

  @ApiProperty({
    description: 'Segmentação dos clientes',
    example: 'clientes_ativos',
    required: false,
  })
  @IsString()
  @IsOptional()
  segmentation?: string;

  @ApiProperty({
    description: 'Modo de segmentação',
    enum: AudienceTargetingMode,
    required: false,
  })
  @IsEnum(AudienceTargetingMode)
  @IsOptional()
  targetingMode?: AudienceTargetingMode;

  @ApiProperty({
    description: 'ID da audiência customizada',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  audienceId?: string;

  @ApiProperty({
    description: 'Quantidade máxima de envios por dia',
    example: 50,
    required: false,
    default: 50,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxDailySends?: number;

  @ApiProperty({
    description: 'URL da imagem',
    example: 'https://exemplo.com/imagem.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    description: 'Modificado por IA',
    example: false,
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  modifiedByAI?: boolean = false;

  @IsEnum(CampaignStatus)
  @IsOptional()
  status: CampaignStatus = CampaignStatus.WAITING;
} 