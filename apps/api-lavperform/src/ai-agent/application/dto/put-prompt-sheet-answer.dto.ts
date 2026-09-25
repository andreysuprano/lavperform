import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

/** Union of sheet-script keys (CONVENTIONAL + SELF_SERVICE). Keep in parity with lavai-agent sheet-script. */
export const PROMPT_SHEET_KEYS = [
  'name',
  'phone',
  'address',
  'hours_seg',
  'hours_ter',
  'hours_qua',
  'hours_qui',
  'hours_sex',
  'hours_sab',
  'hours_dom',
  'referencePoint',
  'generalHours',
  'holidayHours',
  'humanSupportHours',
  'whatsapp',
  'instagram',
  'otherChannels',
  'priceWash',
  'priceDry',
  'priceFullCycle',
  'priceComforter',
  'priceOther',
  'payPix',
  'payCredit',
  'payDebit',
  'payCash',
  'payApp',
  'payOther',
  'productSoap',
  'productSoftener',
  'productOther',
  'productOwn',
  'machineWashers',
  'machineDryers',
  'machineCapacities',
  'machineWashTime',
  'machineDryTime',
  'machineLargePiece',
  'pieceComforter',
  'pieceBlanket',
  'pieceRug',
  'pieceSneakers',
  'piecePet',
  'pieceProhibited',
  'pieceRestrictions',
  'appName',
  'appLink',
  'appFunctions',
  'appAvailability',
  'appCycle',
  'appPayment',
  'supportChannel',
  'supportHours',
  'supportProblem',
  'supportPayment',
  'supportRefund',
  'promotion',
  'wifi',
  'unitSystem',
  'machineSteps',
  'machineFailure',
  'paidNotStarted',
  'realtimeAvailability',
  'pickupDelivery',
  'attendant',
  'serviceWash',
  'serviceDry',
  'serviceIron',
  'serviceFold',
] as const;

export class PutPromptSheetAnswerDto {
  @ApiProperty({ enum: PROMPT_SHEET_KEYS })
  @IsString()
  @IsIn(PROMPT_SHEET_KEYS)
  key!: string;

  @ApiProperty()
  @IsString()
  value!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sheetUpdatedAt?: string;
}
