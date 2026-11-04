import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const HEX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export class UpdateBrandIdentityDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2_500_000)
  logoLightUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2_500_000)
  logoDarkUrl?: string | null;

  @IsString()
  @Matches(HEX)
  primaryColor: string;

  @IsString()
  @Matches(HEX)
  deepColor: string;

  @IsString()
  @Matches(HEX)
  accentColor: string;

  @IsString()
  @Matches(HEX)
  neutralColor: string;

  @IsString()
  @MaxLength(40)
  titleFont: string;

  @IsString()
  @MaxLength(40)
  bodyFont: string;

  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  tones: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  voiceNotes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  references?: string | null;
}
