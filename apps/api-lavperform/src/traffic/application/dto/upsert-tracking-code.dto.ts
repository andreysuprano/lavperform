import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpsertTrackingCodeDto {
  @IsOptional()
  @IsString()
  baseCode?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
