import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { AudienceTargetingMode, CampaignChannel } from '@prisma/client';

export class ReachPreviewDto {
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
    description: 'Canal de veiculação. Quando omitido, o preview não filtra por canal.',
    example: 'WHATSAPP_WEB',
    enum: CampaignChannel,
    required: false,
  })
  @IsEnum(CampaignChannel)
  @IsOptional()
  channel?: CampaignChannel;
}
