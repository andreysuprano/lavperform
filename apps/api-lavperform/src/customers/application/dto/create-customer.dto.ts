import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsDateString, IsIn, Matches } from 'class-validator';
import { formatPhoneNumber } from '../../../common/utils/formatters';

export class AddressDto {
  @ApiProperty({
    description: 'Rua',
    example: 'Av. Paulista',
    required: false
  })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiProperty({
    description: 'Número',
    example: '1000',
    required: false
  })
  @IsString()
  @IsOptional()
  number?: string;

  @ApiProperty({
    description: 'Complemento',
    example: 'Apto 123',
    required: false
  })
  @IsString()
  @IsOptional()
  complement?: string;

  @ApiProperty({
    description: 'Bairro',
    example: 'Bela Vista',
    required: false
  })
  @IsString()
  @IsOptional()
  neighborhood?: string;

  @ApiProperty({
    description: 'Cidade',
    example: 'São Paulo',
    required: false
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({
    description: 'Estado',
    example: 'SP',
    required: false
  })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({
    description: 'CEP',
    example: '01310-100',
    required: false
  })
  @IsString()
  @IsOptional()
  zipCode?: string;
}

export class CreateCustomerDto {
  @ApiProperty({
    description: 'Nome do cliente',
    example: 'João Silva',
    required: true
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Telefone do cliente',
    example: '(41) 99726-9435',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'Email do cliente',
    example: 'joao@exemplo.com',
    required: false
  })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'CPF do cliente',
    example: '12345678900',
    required: false
  })
  @IsString()
  @IsOptional()
  cpf?: string;

  @ApiProperty({
    description: 'Data de nascimento',
    example: '1990-01-01',
    required: false
  })
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @ApiProperty({
    description: 'Data do primeiro pedido',
    example: '2023-01-01',
    required: false
  })
  @IsDateString()
  @IsOptional()
  firstOrderDate?: string;

  @ApiProperty({
    description: 'Classificação RFV (Recência, Frequência, Valor)',
    example: 'A1',
    required: false
  })
  @IsString()
  @IsOptional()
  rfvClassification?: string;

  @ApiProperty({
    description: 'Gênero do cliente',
    example: 'M',
    enum: ['M', 'F', 'Outro'],
    required: false
  })
  @IsString()
  @IsIn(['M', 'F', 'Outro'])
  @IsOptional()
  gender?: string;

  @ApiProperty({
    description: 'Observações sobre o cliente',
    example: 'Cliente prefere entrega após as 18h',
    required: false
  })
  @IsString()
  @IsOptional()
  observations?: string;

  @ApiProperty({
    description: 'Permissão para envio de mensagens via WhatsApp',
    example: true,
    required: false,
    default: true
  })
  @IsOptional()
  whatsappOptin?: boolean;

  @ApiProperty({
    description: 'Ticket médio (valor médio de pedidos)',
    example: 75.50,
    required: false
  })
  @IsOptional()
  averageTicket?: number;

  @ApiProperty({
    description: 'Endereço do cliente',
    type: AddressDto,
    required: false
  })
  @IsOptional()
  address?: AddressDto;

  constructor(partial: Partial<CreateCustomerDto>) {
    Object.assign(this, partial);
    if (this.phone) {
      this.phone = formatPhoneNumber(this.phone);
    }
  }
} 