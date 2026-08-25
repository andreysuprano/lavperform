import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional, IsBoolean, IsEnum, IsArray, ValidateNested, IsInt, Min, ValidateIf, IsUUID, Matches } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { AudienceTargetingMode, AutomaticCampaignType, CampaignChannel } from '@prisma/client';
import { CreateGiftDto } from './create-gift.dto';
import { CreateCreativeDto } from './create-creative.dto';
import { MetaTemplateVariableMappingDto } from './meta-template-variable-mapping.dto';

export class UpdateAutomaticCampaignDto {
  @ApiProperty({
    description: 'Nome da campanha automática',
    example: 'Campanha de Reativação',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Tipo da campanha automática',
    example: 'RECOGNITION',
    enum: AutomaticCampaignType,
    required: false,
  })
  @IsEnum(AutomaticCampaignType)
  @IsOptional()
  type?: AutomaticCampaignType;

  @ApiProperty({
    description: 'Canal de veiculação da campanha',
    example: 'WHATSAPP_WEB',
    enum: CampaignChannel,
    required: false,
  })
  @IsEnum(CampaignChannel)
  @IsOptional()
  channel?: CampaignChannel;

  @ApiProperty({
    description: 'Segmentação RFV dos clientes',
    example: 'clientes_inativos_30_dias',
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
    nullable: true,
  })
  @ValidateIf((o) => o.audienceId !== null)
  @IsUUID()
  @IsOptional()
  audienceId?: string | null;

  @ApiProperty({
    description: 'ID da lista personalizada de envio',
    required: false,
    nullable: true,
  })
  @ValidateIf((o) => o.customSendListId !== null)
  @IsUUID()
  @IsOptional()
  customSendListId?: string | null;

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
    description: 'Campanha ativa',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

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
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'Data de fim da campanha. Enviar null para remover o prazo (campanha com tempo indeterminado).',
    example: '2024-12-31T23:59:59Z',
    required: false,
    nullable: true,
  })
  @ValidateIf((o) => o.endDate !== null)
  @IsDateString()
  @IsOptional()
  endDate?: string | null;

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
    description: 'Texto da mensagem',
    example: 'Sentimos sua falta! Volte e ganhe 20% de desconto!',
    required: false,
  })
  @IsString()
  @IsOptional()
  messageText?: string;

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
    description: 'Lista de criativos da campanha (substitui os existentes). Quando presente, cada envio escolhe aleatoriamente um criativo e uma imagem dele.',
    type: [CreateCreativeDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCreativeDto)
  @IsOptional()
  creatives?: CreateCreativeDto[];

  @ApiProperty({
    description: 'ID do cupom de desconto associado à campanha. Enviar null para remover o vínculo.',
    example: 'b8e6b9c0-1b2c-4db4-9d6c-0b0b2f0f1a23',
    required: false,
    nullable: true,
  })
  @ValidateIf((o) => o.couponId !== null)
  @IsUUID()
  @IsOptional()
  couponId?: string | null;

  @ApiProperty({
    description: 'Horário de início do envio (HH:mm). Enviar null para usar horário de funcionamento.',
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
    description: 'Horário de fim do intervalo de envio (HH:mm). Enviar null para horário fixo ou modo estabelecimento.',
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
  @ValidateIf((o) => o.metaMessageTemplateId !== null)
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
