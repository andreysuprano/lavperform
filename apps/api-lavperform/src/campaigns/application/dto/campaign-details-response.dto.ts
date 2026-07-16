import { ApiProperty } from '@nestjs/swagger';

type CampaignStatus = 'WAITING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export class CampaignDetailsResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  segmentation: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty({ enum: ['WAITING', 'PROCESSING', 'COMPLETED', 'FAILED'] })
  status: CampaignStatus;
}