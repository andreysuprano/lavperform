import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddressDto {  
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