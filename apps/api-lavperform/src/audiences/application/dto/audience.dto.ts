import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class RuleGroupDto {
  @ApiProperty({ enum: ['AND', 'OR'] })
  @IsIn(['AND', 'OR'])
  operator: 'AND' | 'OR';

  @ApiProperty({ type: 'array' })
  @IsArray()
  rules: Array<Record<string, unknown>>;
}

export class AudienceDefinitionDto {
  @ApiProperty({ example: 1 })
  @IsIn([1])
  version: 1;

  @ApiProperty({ type: RuleGroupDto })
  @ValidateNested()
  @Type(() => RuleGroupDto)
  @IsObject()
  include: RuleGroupDto;

  @ApiPropertyOptional({ type: RuleGroupDto })
  @ValidateNested()
  @Type(() => RuleGroupDto)
  @IsObject()
  @IsOptional()
  exclude?: RuleGroupDto;
}

export class CreateAudienceDto {
  @ApiProperty({ example: 'Clientes inativos do Centro' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: AudienceDefinitionDto })
  @ValidateNested()
  @Type(() => AudienceDefinitionDto)
  definition: AudienceDefinitionDto;
}

export class UpdateAudienceDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: AudienceDefinitionDto })
  @ValidateNested()
  @Type(() => AudienceDefinitionDto)
  @IsOptional()
  definition?: AudienceDefinitionDto;
}

export class PreviewAudienceDto {
  @ApiProperty({ type: AudienceDefinitionDto })
  @ValidateNested()
  @Type(() => AudienceDefinitionDto)
  definition: AudienceDefinitionDto;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
