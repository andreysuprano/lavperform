import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { IngestCustomerDto } from './ingest-customer.dto';
import { IngestOrderItemDto } from './ingest-order-item.dto';
import {
  IngestOrderDeliveryAddressDto,
  IngestOrderDiscountDto,
  IngestOrderPaymentDto,
  IngestOrderScheduleDto,
} from './ingest-order-payment.dto';

export class IngestOrderDto {
  @ApiProperty({
    example: 'order-ext-12345',
    description: 'Identificador único do pedido no sistema integrador. Usado para idempotência.',
  })
  @IsString()
  externalOrderId: string;

  @ApiProperty({ example: 12345, description: 'Número exibido do pedido (comanda)' })
  @IsNumber()
  displayId: number;

  @ApiProperty({ example: 'closed', enum: ['closed', 'cancelled', 'pending', 'confirmed'] })
  @IsString()
  @IsIn(['closed', 'cancelled', 'pending', 'confirmed', 'preparing', 'ready', 'delivered'])
  status: string;

  @ApiProperty({ example: 'delivery', enum: ['delivery', 'takeout', 'dine_in'] })
  @IsString()
  @IsIn(['delivery', 'takeout', 'dine_in', 'indoor', 'pickup'])
  orderType: string;

  @ApiProperty({ example: 'instant', enum: ['instant', 'scheduled'] })
  @IsString()
  @IsIn(['instant', 'scheduled'])
  orderTiming: string;

  @ApiPropertyOptional({
    example: 'ifood',
    description: 'Canal de venda. Se omitido, usa o slug do partner (quando partnerId informado) ou "public_api".',
  })
  @IsOptional()
  @IsString()
  salesChannel?: string;

  @ApiPropertyOptional({
    description:
      'ID do partner de origem dos dados. Use quando a integração envia pedidos em nome de um parceiro (ex.: iFood, Anota AI).',
  })
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiPropertyOptional({ example: 'ifood', description: 'Origem do cliente' })
  @IsOptional()
  @IsString()
  customerOrigin?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  merchantId?: number;

  @ApiPropertyOptional({ example: 'Mesa 12' })
  @IsOptional()
  @IsString()
  tableNumber?: string;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsNumber()
  estimatedTime?: number;

  @ApiPropertyOptional({ example: 'Cliente desistiu' })
  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @ApiPropertyOptional({ example: '35260618000134567890123456789012345678901234' })
  @IsOptional()
  @IsString()
  fiscalDocument?: string;

  @ApiPropertyOptional({ example: 'Entregar interfone 101' })
  @IsOptional()
  @IsString()
  observation?: string;

  @ApiProperty({ example: 5.0 })
  @IsNumber()
  deliveryFee: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  serviceFee: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  additionalFee: number;

  @ApiProperty({ example: 55.9 })
  @IsNumber()
  total: number;

  @ApiProperty({ type: IngestCustomerDto })
  @ValidateNested()
  @Type(() => IngestCustomerDto)
  customer: IngestCustomerDto;

  @ApiPropertyOptional({ type: IngestOrderDeliveryAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => IngestOrderDeliveryAddressDto)
  deliveryAddress?: IngestOrderDeliveryAddressDto;

  @ApiPropertyOptional({ type: IngestOrderScheduleDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => IngestOrderScheduleDto)
  schedule?: IngestOrderScheduleDto;

  @ApiPropertyOptional({ type: [IngestOrderItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngestOrderItemDto)
  items?: IngestOrderItemDto[];

  @ApiPropertyOptional({ type: [IngestOrderPaymentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngestOrderPaymentDto)
  payments?: IngestOrderPaymentDto[];

  @ApiPropertyOptional({ type: [IngestOrderDiscountDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngestOrderDiscountDto)
  discounts?: IngestOrderDiscountDto[];

  @ApiProperty({
    example: '2026-06-18T18:30:00.000Z',
    description: 'Data/hora de criação do pedido na origem',
  })
  @IsDateString()
  createdAt: string;

  @ApiProperty({
    example: '2026-06-18T18:45:00.000Z',
    description: 'Data/hora da última atualização do pedido na origem',
  })
  @IsDateString()
  updatedAt: string;
}
