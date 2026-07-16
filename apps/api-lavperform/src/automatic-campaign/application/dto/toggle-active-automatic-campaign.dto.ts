import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ToggleActiveAutomaticCampaignDto {
  @ApiProperty({
    description: 'Estado ativo da campanha',
    example: true,
    required: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  active: boolean;
}
