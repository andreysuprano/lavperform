import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { CampaignStatus, AutomaticCampaignStatus } from '@prisma/client';

export class UpdateCampaignStatusDto {
  @ApiProperty({ description: 'Novo status da campanha', enum: CampaignStatus })
  @IsEnum(CampaignStatus)
  @IsNotEmpty()
  status: CampaignStatus;
}

export class UpdateAutomaticCampaignStatusDto {
  @ApiProperty({ description: 'Novo status da campanha automática', enum: AutomaticCampaignStatus, required: false })
  @IsEnum(AutomaticCampaignStatus)
  @IsNotEmpty()
  status: AutomaticCampaignStatus;
}
