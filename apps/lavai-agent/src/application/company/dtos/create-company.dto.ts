import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Acme Corp', description: 'Nome da empresa' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'acme-corp',
    description: 'Slug único da empresa (letras, números e hífens)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug deve conter apenas letras minúsculas, números e hífens',
  })
  slug: string;

  @ApiPropertyOptional({ example: 'contato@acme.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+5511999999999' })
  @IsString()
  @IsOptional()
  phone?: string;
}
