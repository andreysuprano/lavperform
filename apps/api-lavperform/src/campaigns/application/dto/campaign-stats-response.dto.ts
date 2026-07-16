import { ApiProperty } from '@nestjs/swagger';
import { CampaignStatus } from '@prisma/client';

export class CampaignStatsResponseDto {
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

  @ApiProperty({ enum: CampaignStatus })
  status: CampaignStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  processedAt: Date;

  @ApiProperty()
  totalRecipients: number;

  @ApiProperty()
  totalSent: number;

  @ApiProperty()
  totalDelivered: number;

  @ApiProperty()
  totalRead: number;

  @ApiProperty()
  totalFailed: number;
} 