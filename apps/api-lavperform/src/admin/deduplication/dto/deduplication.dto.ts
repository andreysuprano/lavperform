import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsOptional, IsUUID } from 'class-validator';

export class DeduplicateCustomerOrdersDto {
  @ApiProperty({ description: 'ID da empresa' })
  @IsUUID()
  companyId: string;

  @ApiProperty({ description: 'ID do cliente' })
  @IsUUID()
  customerId: string;
}

export class DeduplicateCampaignAttributionsDto {
  @ApiProperty({ description: 'ID da campanha automática' })
  @IsUUID()
  automaticCampaignId: string;

  @ApiPropertyOptional({
    description: 'Restringe a deduplicação a um cliente específico',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;
}

export class ScanCustomerDuplicatesDto {
  @ApiProperty({ description: 'ID da empresa' })
  @IsUUID()
  companyId: string;
}

export class MergeCustomersDto {
  @ApiProperty({ description: 'ID da empresa' })
  @IsUUID()
  companyId: string;

  @ApiProperty({ description: 'Cadastro que permanece' })
  @IsUUID()
  survivorId: string;

  @ApiProperty({ description: 'Cadastros absorvidos', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  absorbedIds: string[];
}

export class KeepSeparateCustomersDto {
  @ApiProperty({ description: 'ID da empresa' })
  @IsUUID()
  companyId: string;

  @ApiProperty({ description: 'Cadastro que mantém telefone/CPF' })
  @IsUUID()
  keepIdentifierOnCustomerId: string;

  @ApiProperty({ description: 'Cadastros que perdem o identificador compartilhado', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  peerIds: string[];
}
