import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsNotEmpty, IsEnum, Min, ValidateIf, IsUUID } from 'class-validator';
import { AudienceTargetingMode, CampaignChannel, CampaignStatus } from '@prisma/client';

export class CreateCampaignDto {
  @ApiProperty({
    description: 'Nome da campanha',
    example: 'Campanha de Black Friday',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

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
  @IsNotEmpty()
  messageText: string;

  @ApiProperty({
    description: 'Modo de segmentação',
    enum: AudienceTargetingMode,
    required: false,
    default: AudienceTargetingMode.RFV,
  })
  @IsEnum(AudienceTargetingMode)
  @IsOptional()
  targetingMode?: AudienceTargetingMode = AudienceTargetingMode.RFV;

  @ApiProperty({
    description: 'Segmentação RFV dos clientes (CSV)',
    example: 'campeao,fiel',
    required: false,
  })
  @ValidateIf((o) => (o.targetingMode ?? AudienceTargetingMode.RFV) === AudienceTargetingMode.RFV)
  @IsString()
  @IsNotEmpty()
  segmentation?: string;

  @ApiProperty({
    description: 'ID da audiência customizada',
    required: false,
  })
  @ValidateIf((o) => o.targetingMode === AudienceTargetingMode.AUDIENCE)
  @IsUUID()
  @IsNotEmpty()
  audienceId?: string;

  @ApiProperty({
    description: 'ID da lista personalizada de envio',
    required: false,
  })
  @ValidateIf((o) => o.targetingMode === AudienceTargetingMode.CUSTOMER_LIST)
  @IsUUID()
  @IsNotEmpty()
  customSendListId?: string;

  @ApiProperty({
    description: 'Quantidade máxima de envios por dia',
    example: 50,
    required: false,
    default: 50,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxDailySends?: number = 50;

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
  status: CampaignStatus = CampaignStatus.WAITING;

  @ApiProperty({
    description: 'Canal de envio da campanha',
    enum: CampaignChannel,
    example: CampaignChannel.WHATSAPP_WEB,
    required: false,
    default: CampaignChannel.WHATSAPP_WEB,
  })
  @IsEnum(CampaignChannel)
  @IsOptional()
  channel?: CampaignChannel = CampaignChannel.WHATSAPP_WEB;
} 