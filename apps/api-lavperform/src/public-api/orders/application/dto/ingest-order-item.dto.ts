import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, ValidateNested, IsArray } from 'class-validator';

export class IngestOrderOptionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  optionId: number;

  @ApiPropertyOptional({ example: 'OPT-001' })
  @IsOptional()
  @IsString()
  externalCode?: string;

  @ApiProperty({ example: 'Amaciante' })
  @IsString()
  name: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 5.0 })
  @IsNumber()
  unitPrice: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  optionGroupId: number;

  @ApiProperty({ example: 'Acabamento' })
  @IsString()
  optionGroupName: string;
}

export class IngestOrderItemDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
  itemId: number;

  @ApiPropertyOptional({ example: 'PROD-001' })
  @IsOptional()
  @IsString()
  externalCode?: string;

  @ApiProperty({ example: 'Camisa social' })
  @IsString()
  name: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 25.0 })
  @IsNumber()
  unitPrice: number;

  @ApiProperty({ example: 50.0 })
  @IsNumber()
  totalPrice: number;

  @ApiProperty({ example: 'item', enum: ['item', 'combo', 'service'] })
  @IsString()
  kind: string;

  @ApiProperty({ example: 'confirmed', enum: ['confirmed', 'cancelled'] })
  @IsString()
  status: string;

  @ApiPropertyOptional({ example: 'Sem amaciante' })
  @IsOptional()
  @IsString()
  observation?: string;

  @ApiPropertyOptional({ type: [IngestOrderItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngestOrderItemDto)
  items?: IngestOrderItemDto[];

  @ApiPropertyOptional({ type: [IngestOrderOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngestOrderOptionDto)
  options?: IngestOrderOptionDto[];
}
