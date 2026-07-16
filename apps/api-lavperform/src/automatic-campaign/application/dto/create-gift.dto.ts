import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateGiftDto {
  @ApiProperty({
    description: 'Tipo do brinde',
    example: 'desconto',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Unidade do brinde',
    example: 'porcentagem',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({
    description: 'Valor do brinde',
    example: 20.00,
    required: true,
  })
  @IsNumber()
  @IsPositive()
  value: number;
}
