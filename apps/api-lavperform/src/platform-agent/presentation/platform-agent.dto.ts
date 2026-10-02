import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsInt,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  IsOptional,
} from 'class-validator';

export class RunPlatformTurnBodyDto {
  @ApiProperty()
  @IsUUID()
  companyId: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  text: string;
}

export class ListPlatformTurnsQueryDto {
  @ApiProperty()
  @IsUUID()
  companyId: string;

  @ApiPropertyOptional({ default: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}
