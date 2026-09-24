import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

const VOICE_TONES = ['FORMAL', 'FRIENDLY', 'NEUTRAL', 'EMPATHETIC', 'TECHNICAL'] as const;
const COMMUNICATION_STYLES = ['CONCISE', 'DETAILED', 'BALANCED', 'INSTRUCTIVE'] as const;

export class PromptDocumentDto {
  @ApiProperty()
  @IsString()
  contextPrompt!: string;

  @ApiProperty()
  @IsString()
  systemPrompt!: string;

  @ApiProperty()
  @IsString()
  behaviorGuidelines!: string;

  @ApiProperty()
  @IsString()
  guardrails!: string;
}

export class GeneratePromptStudioDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  services!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  focus!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mustNotPromise!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  hoursAndDeadline?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  pricing?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  handoff?: string;

  @ApiProperty({ enum: VOICE_TONES })
  @IsIn(VOICE_TONES)
  voiceTone!: (typeof VOICE_TONES)[number];

  @ApiProperty({ enum: COMMUNICATION_STYLES })
  @IsIn(COMMUNICATION_STYLES)
  communicationStyle!: (typeof COMMUNICATION_STYLES)[number];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  modelName?: string;
}

export class RagChunkDto {
  @ApiProperty()
  @IsString()
  content!: string;

  @ApiProperty()
  @IsNumber()
  score!: number;

  @ApiProperty()
  @IsString()
  id!: string;
}

export class TestPromptStudioDto {
  @ApiProperty({ type: PromptDocumentDto })
  @IsObject()
  @ValidateNested()
  @Type(() => PromptDocumentDto)
  document!: PromptDocumentDto;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  question!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  modelName?: string;

  @ApiPropertyOptional({ type: [RagChunkDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RagChunkDto)
  @IsOptional()
  ragChunks?: RagChunkDto[];
}

export class ProposePromptStudioDto {
  @ApiProperty({ type: PromptDocumentDto })
  @IsObject()
  @ValidateNested()
  @Type(() => PromptDocumentDto)
  document!: PromptDocumentDto;

  @ApiProperty()
  @IsString()
  question!: string;

  @ApiProperty()
  @IsString()
  answer!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  whatWasWrong!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  baseUpdatedAt?: string;

  @ApiProperty({ nullable: true })
  @IsString()
  @IsOptional()
  currentUpdatedAt!: string | null;

  @ApiProperty()
  @IsBoolean()
  draftChanged!: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  modelName?: string;
}
