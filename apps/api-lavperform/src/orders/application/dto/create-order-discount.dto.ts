import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateOrderDiscountDto {
  @IsString()
  type: string;

  @IsNumber()
  value: number;

  @IsOptional()
  @IsString()
  description?: string;
}
