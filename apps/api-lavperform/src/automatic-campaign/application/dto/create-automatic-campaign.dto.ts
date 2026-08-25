import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional, IsBoolean, IsNotEmpty, IsEnum, IsArray, ValidateNested, IsInt, Min, IsUUID, Matches, ValidateIf, IsIn } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { AudienceTargetingMode, AutomaticCampaignType, CampaignChannel } from '@prisma/client';
import { CreateGiftDto } from './create-gift.dto';
import { CreateCreativeDto } from './create-creative.dto';
import { MetaTemplateVariableMappingDto } from './meta-template-variable-mapping.dto';
import { CREATABLE_AUTOMATIC_CAMPAIGN_TYPES } from '../../domain/automatic-campaign-type.rules';

export class CreateAutomaticCampaignDto {
  @ApiProperty({
    description: 'Nome da campanha automática',
    example: 'Campanha de Reativação',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Tipo da campanha automática',
    example: 'SALES',
    enum: CREATABLE_AUTOMATIC_CAMPAIGN_TYPES,
    required: true,
  })
  @IsIn(CREATABLE_AUTOMATIC_CAMPAIGN_TYPES)
  @IsNotEmpty()
  type: AutomaticCampaignType;

  @ApiProperty({
    description: 'Canal de veiculação da campanha',
    example: 'WHATSAPP_WEB',
    enum: CampaignChannel,
    required: false,
    default: CampaignChannel.WHATSAPP_WEB,
  })
  @IsEnum(CampaignChannel)
  @IsOptional()
  channel?: CampaignChannel = CampaignChannel.WHATSAPP_WEB;

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
    description: 'Segmentação RFV dos clientes',
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
    description: 'Campanha ativa',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean = true;

  @ApiProperty({
    description: 'URLs das imagens (JSON)',
    example: '["https://exemplo.com/img1.jpg", "https://exemplo.com/img2.jpg"]',
    required: false,
  })
  @IsString()
  @IsOptional()
  images?: string;

  @ApiProperty({
    description: 'Data de início da campanha',
    example: '2024-12-01T00:00:00Z',
    required: true,
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'Data de fim da campanha. Omitir ou enviar null para campanha com tempo indeterminado.',
    example: '2024-12-31T23:59:59Z',
    required: false,
    nullable: true,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string | null;

  @ApiProperty({
    description: 'Texto da mensagem',
    example: 'Sentimos sua falta! Volte e ganhe 20% de desconto!',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  messageText: string;

  @ApiProperty({
    description: 'Lista de dias da semana que a campanha será enviada',
    example: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  daysOfWeek?: string[];

  @ApiProperty({
    description: 'Lista de brindes/presentes',
    type: [CreateGiftDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGiftDto)
  @IsOptional()
  gifts?: CreateGiftDto[];

  @ApiProperty({
    description: 'Lista de criativos da campanha. Quando presente, cada envio escolhe aleatoriamente um criativo e uma imagem dele. Quando ausente ou vazio, o envio usa os campos legacy `images` e `messageText` da campanha.',
    type: [CreateCreativeDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCreativeDto)
  @IsOptional()
  creatives?: CreateCreativeDto[];

  @ApiProperty({
    description: 'ID do cupom de desconto associado à campanha. O cupom deve pertencer à mesma empresa, estar ativo e dentro da validade.',
    example: 'b8e6b9c0-1b2c-4db4-9d6c-0b0b2f0f1a23',
    required: false,
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  couponId?: string | null;

  @ApiProperty({
    description: 'Horário de início do envio (HH:mm). Omitir para usar horário de funcionamento do estabelecimento.',
    example: '14:00',
    required: false,
    nullable: true,
  })
  @Transform(({ value }) => {
    if (value == null || value === '') return value ?? null;
    if (typeof value !== 'string') return value;
    const match = value.trim().match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
    return match ? `${match[1]}:${match[2]}` : value.trim().slice(0, 5);
  })
  @ValidateIf((o) => o.sendTimeStart != null && o.sendTimeStart !== '')
  @Matches(/^\d{2}:\d{2}$/, { message: 'sendTimeStart deve estar no formato HH:mm' })
  @IsOptional()
  sendTimeStart?: string | null;

  @ApiProperty({
    description: 'Horário de fim do intervalo de envio (HH:mm). Omitir para horário fixo em sendTimeStart.',
    example: '16:00',
    required: false,
    nullable: true,
  })
  @Transform(({ value }) => {
    if (value == null || value === '') return value ?? null;
    if (typeof value !== 'string') return value;
    const match = value.trim().match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
    return match ? `${match[1]}:${match[2]}` : value.trim().slice(0, 5);
  })
  @ValidateIf((o) => o.sendTimeEnd != null && o.sendTimeEnd !== '')
  @Matches(/^\d{2}:\d{2}$/, { message: 'sendTimeEnd deve estar no formato HH:mm' })
  @IsOptional()
  sendTimeEnd?: string | null;

  @ApiProperty({
    description: 'Template Meta aprovado (campanhas de API Oficial). Substitui criativos.',
    required: false,
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  metaMessageTemplateId?: string | null;

  @ApiProperty({
    description: 'Mapeamento das variáveis do template para dados do cliente no envio',
    type: [MetaTemplateVariableMappingDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetaTemplateVariableMappingDto)
  @IsOptional()
  metaTemplateVariableMappings?: MetaTemplateVariableMappingDto[];
}
