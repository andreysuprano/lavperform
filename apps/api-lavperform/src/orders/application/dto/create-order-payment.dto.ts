import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateOrderPaymentDto {
  @IsNumber()
  total: number;

  @IsString()
  paymentType: string;

  @IsOptional()
  @IsNumber()
  changeFor?: number;

  @IsString()
  status: string;

  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  cardNumber?: string;

  @IsOptional()
  @IsString()
  cardBrand?: string;

  @IsOptional()
  @IsString()
  observation?: string;

  @IsNumber()
  paymentFee: number;
}
