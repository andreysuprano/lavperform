import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsInt, IsBoolean, Min, Max } from 'class-validator';

export class UpdateModelConfigDto {
  @ApiPropertyOptional({ description: 'Slug do modelo no OpenRouter (ex: openai/gpt-4o)' })
  @IsString()
  @IsOptional()
  modelName?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 2 })
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 16384 })
  @IsInt()
  @Min(1)
  @Max(16384)
  @IsOptional()
  maxTokens?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  topP?: number;

  @ApiPropertyOptional({ minimum: -2, maximum: 2 })
  @IsNumber()
  @Min(-2)
  @Max(2)
  @IsOptional()
  frequencyPenalty?: number;

  @ApiPropertyOptional({ minimum: -2, maximum: 2 })
  @IsNumber()
  @Min(-2)
  @Max(2)
  @IsOptional()
  presencePenalty?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  streaming?: boolean;
}
