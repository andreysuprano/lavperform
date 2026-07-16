import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { MetaTemplateCategory, MetaTemplateStatus } from '@prisma/client';

export class MetaTemplateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty({ required: false, nullable: true })
  automaticCampaignCreativeId: string | null;

  @ApiProperty({ required: false, nullable: true })
  metaTemplateId: string | null;

  @ApiProperty()
  name: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Nome amigável exibido no app',
  })
  displayName: string | null;

  @ApiProperty({ example: 'pt_BR' })
  language: string;

  @ApiProperty({ enum: MetaTemplateCategory })
  category: MetaTemplateCategory;

  @ApiProperty({ type: Object, isArray: true })
  components: unknown;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'URL pública da mídia usada no header (IMAGE/VIDEO/DOCUMENT), para exibição de prévia no app.',
  })
  headerMediaUrl: string | null;

  @ApiProperty({ enum: MetaTemplateStatus })
  status: MetaTemplateStatus;

  @ApiProperty({ required: false, nullable: true })
  rejectedReason: string | null;

  @ApiProperty({ required: false, nullable: true })
  qualityScore: unknown | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class MetaTemplateSyncResponseDto {
  @ApiProperty({ type: MetaTemplateResponseDto })
  template: MetaTemplateResponseDto;

  @ApiProperty()
  statusChanged: boolean;

  @ApiProperty({
    enum: MetaTemplateStatus,
    description:
      'Status do template antes da sincronização. Útil para detectar transições (ex: PENDING → APPROVED).',
  })
  previousStatus: MetaTemplateStatus;
}

export class SendTestTemplateMessageDto {
  @ApiProperty({
    description:
      'Número de telefone do destinatário em formato E.164 ou com máscara. Será normalizado para apenas dígitos antes do envio (ex: 5541999999999).',
    example: '5541999999999',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/[0-9]/, {
    message: 'O número de telefone deve conter ao menos um dígito',
  })
  to: string;

  @ApiProperty({ description: 'ID local do template Meta a ser enviado' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiPropertyOptional({
    description:
      'Variáveis do corpo do template (substituem {{1}}, {{2}}, ... na ordem informada). Use apenas se o template tiver placeholders no body.',
    type: [String],
    example: ['João', 'Pedido #1234'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(15)
  @IsString({ each: true })
  bodyParameters?: string[];
}

export class SendTestTemplateMessageResponseDto {
  @ApiProperty({ description: 'ID da mensagem retornado pela Meta' })
  metaMessageId: string;

  @ApiProperty({ description: 'Número do destinatário efetivamente usado (já normalizado)' })
  to: string;

  @ApiProperty({ description: 'Nome do template enviado' })
  templateName: string;
}
