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

const SERVICE_MODELS = ['CONVENTIONAL', 'SELF_SERVICE'] as const;

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
  @ApiProperty({ enum: SERVICE_MODELS })
  @IsIn(SERVICE_MODELS)
  model!: (typeof SERVICE_MODELS)[number];

  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
  @IsObject()
  answers!: Record<string, string>;

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
