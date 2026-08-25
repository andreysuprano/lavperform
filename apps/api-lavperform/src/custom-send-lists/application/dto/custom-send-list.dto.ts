import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CampaignChannel } from '@prisma/client';
import { AddressDto } from '../../../customers/application/dto/create-customer.dto';

export class CreateCustomSendListDto {
  @ApiProperty({ example: 'Clientes VIP' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
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
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  customerIds: string[];
}

export class UpdateCustomSendListMembersDto {
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  addCustomerIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  removeCustomerIds?: string[];
}

export class ImportCustomSendListCustomerDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '(11) 99999-9999', required: true })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  firstOrderDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  rfvClassification?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  observations?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  whatsappOptin?: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  averageTicket?: number;

  @ApiPropertyOptional({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;
}

export class ImportCustomSendListCustomersDto {
  @ApiProperty({ type: [ImportCustomSendListCustomerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportCustomSendListCustomerDto)
  customers: ImportCustomSendListCustomerDto[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Quando informado, substitui os membros antes de processar o CSV',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  replaceCustomerIds?: string[];
}

export class EligibleCountQueryDto {
  @ApiPropertyOptional({ enum: CampaignChannel, default: CampaignChannel.WHATSAPP_WEB })
  @IsOptional()
  @IsEnum(CampaignChannel)
  channel?: CampaignChannel = CampaignChannel.WHATSAPP_WEB;
}
