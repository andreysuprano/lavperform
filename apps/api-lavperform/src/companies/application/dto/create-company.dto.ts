import { IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({
    description: 'Slug da empresa',
    example: 'empresa-exemplo',
    required: true
  })
  @IsString()
  slug: string;

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
    description: 'CEP do endereço',
    example: '12345-678',
    required: true
  })
  @IsString()
  zipCode: string;

  @ApiProperty({
    description: 'Rua/Avenida',
    example: 'Rua Exemplo',
    required: true
  })
  @IsString()
  street: string;

  @ApiProperty({
    description: 'Número',
    example: '123',
    required: true
  })
  @IsString()
  number: string;

  @ApiProperty({
    description: 'Complemento',
    example: 'Sala 1',
    required: false
  })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiProperty({
    description: 'Bairro',
    example: 'Centro',
    required: true
  })
  @IsString()
  neighborhood: string;

  @ApiProperty({
    description: 'Cidade',
    example: 'São Paulo',
    required: true
  })
  @IsString()
  city: string;

  @ApiProperty({
    description: 'Estado',
    example: 'SP',
    required: true
  })
  @IsString()
  state: string;

  @ApiProperty({
    description: 'ID do parceiro',
    example: '123',
    required: false
  })
  @IsOptional()
  @IsString()
  businessPartnerId?: string;
} 