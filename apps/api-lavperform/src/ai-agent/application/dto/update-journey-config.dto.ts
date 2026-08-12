import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export enum JourneyTrigger {
  FIRST_MESSAGE = 'FIRST_MESSAGE',
  MENU_LINK_SENT = 'MENU_LINK_SENT',
  MANUAL = 'MANUAL',
}

export class FollowUpStepDto {
  @ApiPropertyOptional()
  @IsUUID()
  id: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 1440 })
  @IsInt()
  @Min(1)
  @Max(1440)
  delayMinutes: number;

  @ApiPropertyOptional({ enum: ['JOURNEY_START', 'PREVIOUS_STEP'] })
  @IsEnum(['JOURNEY_START', 'PREVIOUS_STEP'])
  delayFrom: 'JOURNEY_START' | 'PREVIOUS_STEP';

  @ApiPropertyOptional({ minLength: 1, maxLength: 1000 })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;

  @ApiPropertyOptional()
  @IsBoolean()
  askForHelp: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  active: boolean;
}

export class UpdateJourneyConfigDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ enum: JourneyTrigger })
  @IsEnum(JourneyTrigger)
  @IsOptional()
  journeyTrigger?: JourneyTrigger;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  followUpEnabled?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  cancelOnReply?: boolean;

  @ApiPropertyOptional({ type: [FollowUpStepDto], maxItems: 10 })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => FollowUpStepDto)
  @IsOptional()
  followUpSteps?: FollowUpStepDto[];

  @ApiPropertyOptional({ type: [String], maxItems: 20 })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(50, { each: true })
  @IsOptional()
  helpKeywords?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  helpAutoEscalate?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  helpAckMessage?: string | null;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  purchaseWebhookEnabled?: boolean;
}
