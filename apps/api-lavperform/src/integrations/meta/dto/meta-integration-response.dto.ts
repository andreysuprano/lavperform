import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MetaIntegrationResponseDto {
  @ApiProperty({ example: 'uuid-da-integracao' })
  id: string;

  @ApiProperty({ example: 'uuid-da-empresa' })
  companyId: string;

  @ApiProperty({ example: '5541997269435' })
  phoneNumber: string;

  @ApiPropertyOptional({ example: '106540352242922' })
  phoneNumberId: string | null;

  @ApiPropertyOptional({ example: '524126980791429' })
  wabaId: string | null;

  @ApiPropertyOptional({ example: '2729063490586005' })
  businessId: string | null;

  @ApiPropertyOptional({ example: 'Meu Restaurante' })
  displayName: string | null;

  @ApiPropertyOptional({ example: 'GREEN' })
  qualityRating: string | null;

  @ApiPropertyOptional({ example: 'TIER_1K' })
  messagingLimitTier: string | null;

  @ApiProperty({ example: false })
  webhooksSubscribed: boolean;

  @ApiProperty({ example: false })
  phoneNumberRegistered: boolean;

  @ApiProperty({ example: 'PENDING' })
  status: string;

  @ApiPropertyOptional({ description: 'Última sincronização dos dados do número com a Meta API', nullable: true })
  phoneInfoLastSyncAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class MetaIntegrationAvailabilityResponseDto {
  @ApiProperty({ example: true })
  available: boolean;

  @ApiProperty({ example: 'ACTIVE', required: false, nullable: true })
  status: string | null;

  @ApiProperty({ example: true })
  hasPhoneNumberId: boolean;

  @ApiProperty({ example: true })
  hasWabaId: boolean;

  @ApiProperty({
    example: true,
    description: 'Indica se o número foi registrado no Cloud API (status = CONNECTED)',
  })
  phoneNumberRegistered: boolean;

  @ApiPropertyOptional({ example: 'Meu Restaurante' })
  displayName: string | null;

  @ApiPropertyOptional({ example: '5541997269435' })
  phoneNumber: string | null;
}
