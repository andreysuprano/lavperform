import { ApiPropertyOptional } from '@nestjs/swagger';
import { AutomaticCampaignType } from '@prisma/client';
import { IsIn, IsOptional } from 'class-validator';

import { CREATABLE_AUTOMATIC_CAMPAIGN_TYPES } from '../../domain/automatic-campaign-type.rules';

export class DuplicateAutomaticCampaignDto {
  @ApiPropertyOptional({
    description:
      'Novo tipo obrigatório ao duplicar campanhas antigas de Aquisição, Recorrência ou Reativação',
    enum: CREATABLE_AUTOMATIC_CAMPAIGN_TYPES,
  })
  @IsIn(CREATABLE_AUTOMATIC_CAMPAIGN_TYPES)
  @IsOptional()
  targetType?: AutomaticCampaignType;
}
