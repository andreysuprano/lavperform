import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ProvisionSubscriptionDto {
  @ApiPropertyOptional({
    description: 'Plano a provisionar (usa o plano vinculado à empresa se omitido)',
  })
  @IsOptional()
  @IsUUID()
  planId?: string;
}
