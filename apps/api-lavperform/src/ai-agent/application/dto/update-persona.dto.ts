import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { VoiceTone, CommunicationStyle, AgentLanguage } from './create-agent.dto';

export class UpdatePersonaDto {
  @ApiPropertyOptional() @IsString() @IsOptional() personaName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() personaDescription?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() systemPrompt?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() behaviorGuidelines?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() guardrails?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() contextPrompt?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() welcomeMessage?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() messageSignature?: string;
  @ApiPropertyOptional({ enum: VoiceTone }) @IsEnum(VoiceTone) @IsOptional() voiceTone?: VoiceTone;
  @ApiPropertyOptional({ enum: CommunicationStyle }) @IsEnum(CommunicationStyle) @IsOptional() communicationStyle?: CommunicationStyle;
  @ApiPropertyOptional({ enum: AgentLanguage }) @IsEnum(AgentLanguage) @IsOptional() language?: AgentLanguage;
}
