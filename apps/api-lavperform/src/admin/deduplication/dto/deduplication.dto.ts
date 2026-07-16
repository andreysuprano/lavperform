import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

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
