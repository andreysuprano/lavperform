import { IsString, IsEmail, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AddressDto } from 'src/common/dto/address.dto';
import { Type } from 'class-transformer';

export class UpdateCompanyDto {
  @ApiProperty({
    description: 'Nome da empresa',
    example: 'Empresa Exemplo',
    required: true
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'CNPJ da empresa',
    example: '12345678901234',
    required: true
  })
  @IsString()
  cnpj: string;

  @ApiProperty({
    description: 'Email da empresa',
    example: 'contato@empresa.com',
    required: true
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Telefone da empresa',
    example: '(11) 99999-9999',
    required: false
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Endereço da empresa',
    example: {
      zipCode: '12345-678',
      street: 'Rua Exemplo',
      number: '123',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP'
    },
    required: true
  })
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @ApiProperty({
    description: 'Exibir o box de vendas incentivadas na dashboard do app',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  showIncentivizedSales?: boolean;

  @ApiProperty({
    description: 'Exibir o box de compras do dia na dashboard do app',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  showTodayPurchases?: boolean;
} 