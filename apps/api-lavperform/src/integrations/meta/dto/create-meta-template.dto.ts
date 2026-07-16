import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { MetaTemplateCategory } from '@prisma/client';

export enum MetaTemplateHeaderFormat {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
}

export enum MetaTemplateButtonType {
  QUICK_REPLY = 'QUICK_REPLY',
  URL = 'URL',
  PHONE_NUMBER = 'PHONE_NUMBER',
}

export class MetaTemplateHeaderDto {
  @ApiProperty({ enum: MetaTemplateHeaderFormat })
  @IsEnum(MetaTemplateHeaderFormat)
  format: MetaTemplateHeaderFormat;

  @ApiPropertyOptional({
    description: 'Texto do header (obrigatório quando format=TEXT). Suporta {{1}}.',
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  text?: string;

  @ApiPropertyOptional({
    description:
      'Exemplo para variável do header TEXT (substitui {{1}} na submissão).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  example?: string;

  @ApiPropertyOptional({
    description:
      'URL pública da mídia para header IMAGE/VIDEO/DOCUMENT. O backend faz upload para a Meta.',
  })
  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true })
  mediaUrl?: string;
}

export class MetaTemplateBodyDto {
  @ApiProperty({ description: 'Corpo do template. Suporta variáveis {{1}}, {{2}}, etc.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  text: string;

  @ApiPropertyOptional({
    description:
      'Exemplos para variáveis do body, na ordem {{1}}, {{2}}, ...',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(15)
  @IsString({ each: true })
  examples?: string[];
}

export class MetaTemplateButtonDto {
  @ApiProperty({ enum: MetaTemplateButtonType })
  @IsEnum(MetaTemplateButtonType)
  type: MetaTemplateButtonType;

  @ApiProperty({ description: 'Rótulo do botão (até 25 caracteres)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(25)
  text: string;

  @ApiPropertyOptional({
    description: 'URL base para botão URL. Pode conter {{1}} no final.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string;

  @ApiPropertyOptional({
    description: 'Exemplo do sufixo dinâmico para botão URL (substitui {{1}}).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  urlExample?: string;

  @ApiPropertyOptional({ description: 'Número E.164 para botão PHONE_NUMBER' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;
}

export class CreateMetaTemplateDto {
  @ApiProperty({
    description:
      'Nome amigável para identificar o template no app. O identificador técnico enviado à Meta é gerado automaticamente.',
    example: 'Promoção Verão 2026',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  displayName: string;

  @ApiProperty({ enum: MetaTemplateCategory, default: MetaTemplateCategory.MARKETING })
  @IsEnum(MetaTemplateCategory)
  category: MetaTemplateCategory;

  @ApiProperty({ example: 'pt_BR', default: 'pt_BR' })
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiPropertyOptional({ type: MetaTemplateHeaderDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MetaTemplateHeaderDto)
  header?: MetaTemplateHeaderDto;

  @ApiProperty({ type: MetaTemplateBodyDto })
  @ValidateNested()
  @Type(() => MetaTemplateBodyDto)
  body: MetaTemplateBodyDto;

  @ApiPropertyOptional({ description: 'Rodapé opcional (até 60 caracteres)' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  footer?: string;

  @ApiPropertyOptional({ type: MetaTemplateButtonDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => MetaTemplateButtonDto)
  buttons?: MetaTemplateButtonDto[];
}

export class MetaTemplateSyncAllResponseDto {
  @ApiProperty()
  synced: number;

  @ApiProperty()
  statusChanged: number;

  @ApiProperty()
  approved: number;
}
