import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsObject } from 'class-validator';
import type { ServiceModel } from '../../prompt-studio/sheet-script';

export class ApplySheetFactsDto {
  @ApiProperty({ enum: ['CONVENTIONAL', 'SELF_SERVICE'] })
  @IsIn(['CONVENTIONAL', 'SELF_SERVICE'])
  serviceModel!: ServiceModel;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
  @IsObject()
  answers!: Record<string, string>;
}
