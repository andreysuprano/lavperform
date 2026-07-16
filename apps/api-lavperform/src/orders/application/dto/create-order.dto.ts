import { IsString, IsNumber, IsOptional, IsDate, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';
import { CreateOrderDiscountDto } from './create-order-discount.dto';
import { CreateOrderPaymentDto } from './create-order-payment.dto';
import { CreateOrderDeliveryAddressDto } from './create-order-delivery-address.dto';
import { CreateOrderScheduleDto } from './create-order-schedule.dto';

export class CreateOrderDto {
  @IsOptional()
  @IsNumber()
  integratorOrderId?: number;

  @IsOptional()
  @IsString()
  externalOrderId?: string;

  @IsNumber()
  displayId: number;

  @IsNumber()
  merchantId: number;

  @IsString()
  status: string;

  @IsString()
  orderType: string;

  @IsString()
  orderTiming: string;

  @IsString()
  salesChannel: string;

  @IsOptional()
  @IsString()
  customerOrigin?: string;

  @IsOptional()
  @IsString()
  tableNumber?: string;

  @IsOptional()
  @IsNumber()
  estimatedTime?: number;

  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @IsOptional()
  @IsString()
  fiscalDocument?: string;

  @IsOptional()
  @IsString()
  observation?: string;

  @IsNumber()
  deliveryFee: number;

  @IsNumber()
  serviceFee: number;

  @IsNumber()
  additionalFee: number;

  @IsNumber()
  total: number;

  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsString()
  companyId: string;

  @IsString()
  customerId: string;

  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @IsDate()
  @Type(() => Date)
  updatedAt: Date;

  // Relacionamentos
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateOrderDeliveryAddressDto)
  deliveryAddress?: CreateOrderDeliveryAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateOrderScheduleDto)
  schedule?: CreateOrderScheduleDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderDiscountDto)
  discounts?: CreateOrderDiscountDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderPaymentDto)
  payments?: CreateOrderPaymentDto[];
}
