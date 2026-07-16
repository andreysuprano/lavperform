import { IsString, IsNumber, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderOptionDto {
  @IsNumber()
  optionId: number;

  @IsOptional()
  @IsString()
  externalCode?: string;

  @IsString()
  name: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsNumber()
  optionGroupId: number;

  @IsString()
  optionGroupName: string;
}

export class CreateOrderItemDto {
  @IsNumber()
  itemId: number;

  @IsOptional()
  @IsString()
  externalCode?: string;

  @IsString()
  name: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsNumber()
  totalPrice: number;

  @IsString()
  kind: string;

  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  observation?: string;

  @IsOptional()
  @IsString()
  parentItemId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderOptionDto)
  options?: CreateOrderOptionDto[];
}
