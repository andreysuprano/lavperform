import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateInstanceAdminFieldsDto {
  @ApiProperty({
    description: 'Campo administrativo livre 1 (ex: nome da empresa)',
    required: false,
    example: 'Lavanderia Exemplo',
  })
  @IsOptional()
  @IsString()
  adminField01?: string;

  @ApiProperty({
    description: 'Campo administrativo livre 2 (ex: ID da empresa na plataforma)',
    required: false,
    example: 'company-uuid',
  })
  @IsOptional()
  @IsString()
  adminField02?: string;

  @ApiProperty({
    description: 'Nome do sistema exibido na instância',
    required: false,
    example: 'FoodCRM',
  })
  @IsOptional()
  @IsString()
  systemName?: string;
}
