import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Validate,
  ValidateNested,
} from 'class-validator';
import { PhoneOrCpfConstraint } from './validators/phone-or-cpf.validator';

export class IngestAddressDto {
  @ApiPropertyOptional({ example: 'Av. Paulista' })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({ example: '1000' })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiPropertyOptional({ example: 'Apto 123' })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiPropertyOptional({ example: 'Bela Vista' })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '01310-100' })
  @IsOptional()
  @IsString()
  zipCode?: string;
}

export class IngestCustomerDto {
  @ApiProperty({ example: 'João Silva', description: 'Nome completo do cliente' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: '41997269435',
    description: 'Telefone com ou sem máscara. Obrigatório se cpf não for informado.',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: '12345678900',
    description: 'CPF do cliente (somente dígitos). Obrigatório se phone não for informado.',
  })
  @IsOptional()
  @IsString()
  cpf?: string;

  @ApiPropertyOptional({ example: 'joao@exemplo.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '1990-01-01' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ example: 'M', enum: ['M', 'F', 'Outro'] })
  @IsOptional()
  @IsIn(['M', 'F', 'Outro'])
  gender?: string;

  @ApiPropertyOptional({ type: IngestAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => IngestAddressDto)
  address?: IngestAddressDto;

  @Validate(PhoneOrCpfConstraint)
  _phoneOrCpfCheck?: boolean;
}
