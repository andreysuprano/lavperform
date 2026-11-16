import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

const CHANNELS = ['FACEBOOK', 'INSTAGRAM', 'GOOGLE_BUSINESS'] as const;

export class CreateScheduledPostDto {
  @IsUUID()
  companyId!: string;

  @IsOptional()
  @IsUUID()
  draftId?: string;

  @IsOptional()
  @IsUUID()
  variationId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(CHANNELS, { each: true })
  channels!: string[];

  @IsString()
  @MinLength(1)
  caption!: string;

  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  imageDataUrl?: string;

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @IsOptional()
  @IsBoolean()
  publishNow?: boolean;
}

export class UpdateScheduledPostDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(CHANNELS, { each: true })
  channels?: string[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  caption?: string;

  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @IsOptional()
  @IsBoolean()
  publishNow?: boolean;
}

export class SelectMetaDto {
  @IsString()
  pageId!: string;

  @IsOptional()
  @IsString()
  igUserId?: string;

  @IsOptional()
  @IsString()
  adAccountId?: string;
}

export class SelectGoogleDto {
  @IsString()
  locationId!: string;

  @IsOptional()
  @IsString()
  adCustomerId?: string;
}

export class ReplyReviewDto {
  @IsString()
  @MinLength(1)
  comment!: string;
}
