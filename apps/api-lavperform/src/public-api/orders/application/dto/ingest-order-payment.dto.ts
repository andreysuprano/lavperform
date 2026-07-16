import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class IngestOrderPaymentDto {
  @ApiProperty({ example: 55.9 })
  @IsNumber()
  total: number;

  @ApiProperty({ example: 'online', description: 'Tipo do pagamento (online, offline, etc.)' })
  @IsString()
  paymentType: string;

  @ApiProperty({ example: 'paid', enum: ['paid', 'pending', 'refunded'] })
  @IsString()
  status: string;

  @ApiProperty({ example: 'credit_card', description: 'Método de pagamento' })
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  changeFor?: number;

  @ApiPropertyOptional({ example: '****1234' })
  @IsOptional()
  @IsString()
  cardNumber?: string;

  @ApiPropertyOptional({ example: 'visa' })
  @IsOptional()
  @IsString()
  cardBrand?: string;

  @ApiPropertyOptional({ example: 'Pagamento aprovado' })
  @IsOptional()
  @IsString()
  observation?: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  paymentFee: number;
}

export class IngestOrderDiscountDto {
  @ApiProperty({ example: 'coupon' })
  @IsString()
  type: string;

  @ApiProperty({ example: 10.0 })
  @IsNumber()
  value: number;

  @ApiPropertyOptional({ example: 'Cupom de boas-vindas' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class IngestOrderDeliveryAddressDto {
  @ApiPropertyOptional({ example: 'Rua das Flores' })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({ example: '123' })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiPropertyOptional({ example: 'Bloco B' })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiPropertyOptional({ example: 'Centro' })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiPropertyOptional({ example: 'Curitiba' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'PR' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '80010-000' })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional({ example: 'Portão azul' })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class IngestOrderScheduleDto {
  @ApiProperty({ example: '2026-06-18' })
  @IsString()
  deliveryDateRaw: string;

  @ApiProperty({ example: '19:30' })
  @IsString()
  deliveryTimeRaw: string;

  @ApiPropertyOptional({ example: '2026-06-18T19:30:00.000Z' })
  @IsOptional()
  @IsString()
  deliveryAt?: string;
}
