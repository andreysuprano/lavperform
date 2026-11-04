import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  ART_STYLES,
  CAPTION_LENGTHS,
  POST_FORMATS,
  POST_OBJECTIVES,
} from '../domain/social-post.types';

export class CreateSocialDraftDto {
  @IsUUID()
  companyId: string;

  @IsIn(POST_OBJECTIVES)
  objective: string;

  @IsString()
  @MinLength(8)
  @MaxLength(1000)
  theme: string;

  @IsIn(POST_FORMATS)
  format: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  slideCount?: number;

  @IsIn(ART_STYLES)
  artStyle: string;

  @IsOptional()
  @IsBoolean()
  includeCaption?: boolean;
}

export class SelectVariationDto {
  @IsUUID()
  variationId: string;
}

export class LayerDto {
  @IsString()
  @MaxLength(80)
  id: string;

  @IsIn(['background', 'color-band', 'logo', 'title', 'badge', 'text'])
  type: string;

  @IsString()
  @MaxLength(80)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  fontFamily?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fontSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  backgroundColor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  opacity?: number;

  @Type(() => Number)
  @IsNumber()
  x: number;

  @Type(() => Number)
  @IsNumber()
  y: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  width?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  height?: number;

  @IsBoolean()
  locked: boolean;

  @IsBoolean()
  visible: boolean;

  @IsOptional()
  @IsIn(['light', 'dark'])
  logoVariant?: 'light' | 'dark';
}

export class UpdateVariationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9)
  slideIndex?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LayerDto)
  layers?: LayerDto[];

  @IsOptional()
  @IsString()
  @MaxLength(160)
  headline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  badgeText?: string;

  @IsOptional()
  @IsIn(CAPTION_LENGTHS)
  activeCaption?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  captionShort?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  captionMedium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  captionLong?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];
}

export class RegenerateBackgroundDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9)
  slideIndex?: number;
}

export class RewriteCaptionDto {
  @IsIn(CAPTION_LENGTHS)
  length: string;
}

export class RevisePostDto {
  @IsString()
  @MaxLength(500)
  prompt: string;
}

export class SelectVersionDto {
  @IsUUID()
  versionId: string;
}

export class CreateReferenceDto {
  @IsUUID()
  companyId: string;

  @IsString()
  @MaxLength(14_000_000)
  dataUrl: string;
}

export class ReorderReferencesDto {
  @IsUUID()
  companyId: string;

  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}

export class AttachReferencesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  referenceIds: string[];
}
