import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum SubscriptionAsaasStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class UpdateSubscriptionStatusDto {
  @ApiProperty({ enum: SubscriptionAsaasStatus })
  @IsEnum(SubscriptionAsaasStatus)
  status: SubscriptionAsaasStatus;

  @ApiPropertyOptional({
    description: 'Obrigatório ao reativar (ACTIVE). Data da próxima cobrança (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  nextDueDate?: string;
}
