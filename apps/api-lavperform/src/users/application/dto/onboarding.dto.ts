import { IsString, IsEmail, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CompanyDataDto {
  @ApiProperty({
    description: 'Nome da empresa',
    example: 'Empresa Exemplo',
    required: true
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'CNPJ da empresa',
    example: '12345678000190',
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
    required: true
  })
  @IsString()
  phone: string;

  @ApiProperty({
    description: 'CEP da empresa',
    example: '12345-678',
    required: true
  })
  @IsString()
  zipCode: string;

  @ApiProperty({
    description: 'Rua da empresa',
    example: 'Rua Exemplo',
    required: true
  })
  @IsString()
  street: string;

  @ApiProperty({
    description: 'Número do endereço',
    example: '123',
    required: true
  })
  @IsString()
  number: string;

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
    description: 'Complemento',
    example: 'Apto 123',
    required: false
  })
  @IsOptional()
  @IsString()
  complement?: string;
}

export class OnboardingDto {
  @ApiProperty({
    description: 'Dados da empresa',
    type: CompanyDataDto,
    required: true
  })
  @ValidateNested()
  @Type(() => CompanyDataDto)
  company: CompanyDataDto;

  @ApiProperty({
    description: 'Nome do usuário',
    example: 'João Silva',
    required: true
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'joao@empresa.com',
    required: true
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'senha123',
    required: true
  })
  @IsString()
  password: string;

  @ApiProperty({
    description: 'Telefone do usuário',
    example: '(11) 99999-9999',
    required: true
  })
  @IsString()
  phone: string;

  @ApiProperty({
    description: 'ID do plano',
    example: '123',
    required: true
  })
  @IsString()
  planId: string;

  @ApiProperty({
    description: 'ID do parceiro',
    example: '123',
    required: false
  })
  @IsOptional()
  @IsString()
  businessPartnerId?: string;
} 