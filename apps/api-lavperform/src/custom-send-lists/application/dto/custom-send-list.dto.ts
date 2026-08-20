import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { CampaignChannel } from '@prisma/client';

export class CreateCustomSendListDto {
  @ApiProperty({ example: 'Clientes VIP' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [String], minItems: 1, maxItems: 5000 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @IsUUID('4', { each: true })
  customerIds: string[];
}

export class UpdateCustomSendListDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class ReplaceCustomSendListMembersDto {
  @ApiProperty({ type: [String], minItems: 1, maxItems: 5000 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @IsUUID('4', { each: true })
  customerIds: string[];
}

export class EligibleCountQueryDto {
  @ApiPropertyOptional({ enum: CampaignChannel, default: CampaignChannel.WHATSAPP_WEB })
  @IsOptional()
  @IsEnum(CampaignChannel)
  channel?: CampaignChannel = CampaignChannel.WHATSAPP_WEB;
}
