import { IsString, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderScheduleDto {
  @IsString()
  deliveryDateRaw: string;

  @IsString()
  deliveryTimeRaw: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  deliveryAt?: Date;
}
