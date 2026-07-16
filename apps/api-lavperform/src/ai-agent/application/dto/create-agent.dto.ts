import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  ValidateNested,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum VoiceTone {
  FORMAL = 'FORMAL',
  INFORMAL = 'INFORMAL',
  FRIENDLY = 'FRIENDLY',
  PROFESSIONAL = 'PROFESSIONAL',
  EMPATHETIC = 'EMPATHETIC',
  ASSERTIVE = 'ASSERTIVE',
}

export enum CommunicationStyle {
  CONCISE = 'CONCISE',
  DETAILED = 'DETAILED',
  TECHNICAL = 'TECHNICAL',
  SIMPLIFIED = 'SIMPLIFIED',
  BALANCED = 'BALANCED',
}

export enum AgentLanguage {
  PT_BR = 'PT_BR',
  EN_US = 'EN_US',
  ES_ES = 'ES_ES',
}

export enum MemoryType {
  BUFFER = 'BUFFER',
  SUMMARY = 'SUMMARY',
  VECTOR = 'VECTOR',
  NONE = 'NONE',
}

export class CreateAgentPersonaDto {
  @ApiPropertyOptional() @IsString() @IsOptional() personaName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() systemPrompt?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() welcomeMessage?: string;
  @ApiPropertyOptional({ enum: VoiceTone }) @IsEnum(VoiceTone) @IsOptional() voiceTone?: VoiceTone;
  @ApiPropertyOptional({ enum: CommunicationStyle }) @IsEnum(CommunicationStyle) @IsOptional() communicationStyle?: CommunicationStyle;
  @ApiPropertyOptional({ enum: AgentLanguage }) @IsEnum(AgentLanguage) @IsOptional() language?: AgentLanguage;
}

export class CreateAgentModelConfigDto {
  @ApiPropertyOptional() @IsString() @IsOptional() modelName?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() temperature?: number;
  @ApiPropertyOptional() @IsInt() @IsOptional() maxTokens?: number;
}

export class CreateAgentMemoryConfigDto {
  @ApiPropertyOptional({ enum: MemoryType }) @IsEnum(MemoryType) @IsOptional() memoryType?: MemoryType;
  @ApiPropertyOptional() @IsInt() @Min(1) @Max(100) @IsOptional() windowSize?: number;
}

export class CreateAgentDto {
  @ApiProperty({ description: 'Nome do agente' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Descrição do propósito do agente' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Nome único da instância WhatsApp (UAZAPI)' })
  @IsString()
  @IsOptional()
  instanceName?: string;

  @ApiPropertyOptional({ type: () => CreateAgentPersonaDto })
  @IsObject()
  @ValidateNested()
  @Type(() => CreateAgentPersonaDto)
  @IsOptional()
  persona?: CreateAgentPersonaDto;

  @ApiPropertyOptional({ type: () => CreateAgentModelConfigDto })
  @IsObject()
  @ValidateNested()
  @Type(() => CreateAgentModelConfigDto)
  @IsOptional()
  modelConfig?: CreateAgentModelConfigDto;

  @ApiPropertyOptional({ type: () => CreateAgentMemoryConfigDto })
  @IsObject()
  @ValidateNested()
  @Type(() => CreateAgentMemoryConfigDto)
  @IsOptional()
  memoryConfig?: CreateAgentMemoryConfigDto;
}
